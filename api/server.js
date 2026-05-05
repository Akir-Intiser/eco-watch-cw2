require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { BlobServiceClient } = require("@azure/storage-blob");
const { CosmosClient } = require("@azure/cosmos");

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage()
});

app.use(cors());
app.use(express.json());

const blobConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const blobContainerName = process.env.AZURE_STORAGE_CONTAINER_NAME || "sightings";

const cosmosEndpoint = process.env.COSMOS_ENDPOINT;
const cosmosKey = process.env.COSMOS_KEY;
const cosmosDatabaseName = process.env.COSMOS_DATABASE_NAME || "EcoWatchDb";
const sightingsContainerName = process.env.COSMOS_CONTAINER_NAME || "Sightings";
const usersContainerName = "Users";

const jwtSecret = process.env.JWT_SECRET;

const validStatuses = ["Open", "In Review", "Resolved"];

if (!blobConnectionString) {
  console.error("Missing AZURE_STORAGE_CONNECTION_STRING in api/.env");
  process.exit(1);
}

if (!cosmosEndpoint || !cosmosKey) {
  console.error("Missing COSMOS_ENDPOINT or COSMOS_KEY in api/.env");
  process.exit(1);
}

if (!jwtSecret) {
  console.error("Missing JWT_SECRET in api/.env");
  process.exit(1);
}

const blobServiceClient = BlobServiceClient.fromConnectionString(blobConnectionString);
const blobContainerClient = blobServiceClient.getContainerClient(blobContainerName);

const cosmosClient = new CosmosClient({
  endpoint: cosmosEndpoint,
  key: cosmosKey
});

const cosmosDatabase = cosmosClient.database(cosmosDatabaseName);
const sightingsContainer = cosmosDatabase.container(sightingsContainerName);
const usersContainer = cosmosDatabase.container(usersContainerName);

function normaliseStatus(status) {
  if (validStatuses.includes(status)) {
    return status;
  }

  return "Open";
}

function createToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      email: user.email
    },
    jwtSecret,
    {
      expiresIn: "24h"
    }
  );
}

function getTokenFromHeader(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.replace("Bearer ", "");
}

function requireAuth(req, res, next) {
  const token = getTokenFromHeader(req);

  if (!token) {
    return res.status(401).json({
      message: "Authentication required"
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
}

async function uploadImageToAzure(file) {
  if (!file) {
    return "";
  }

  const fileExtension = path.extname(file.originalname);
  const blobName = `${crypto.randomUUID()}${fileExtension}`;
  const blockBlobClient = blobContainerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: {
      blobContentType: file.mimetype
    }
  });

  return blockBlobClient.url;
}

async function findUserByEmail(email) {
  const query = {
    query: "SELECT * FROM c WHERE c.email = @email",
    parameters: [
      {
        name: "@email",
        value: email.toLowerCase()
      }
    ]
  };

  const { resources } = await usersContainer.items.query(query).fetchAll();
  return resources[0] || null;
}

async function findSightingById(id) {
  const query = {
    query: "SELECT * FROM c WHERE c.id = @id",
    parameters: [
      {
        name: "@id",
        value: id
      }
    ]
  };

  const { resources } = await sightingsContainer.items.query(query).fetchAll();
  return resources[0] || null;
}

app.get("/", (req, res) => {
  res.json({
    message: "ECO-WATCH API is running",
    imageStorage: "Azure Blob Storage",
    metadataStorage: "Azure Cosmos DB",
    authentication: "JWT login enabled",
    features: [
      "Register/login",
      "Owner-only update/delete",
      "Image upload",
      "Report status"
    ],
    endpoints: [
      "POST /api/auth/register",
      "POST /api/auth/login",
      "GET /api/sightings",
      "POST /api/sightings",
      "PUT /api/sightings/:id",
      "DELETE /api/sightings/:id"
    ]
  });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email, and password are required"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters"
      });
    }

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists"
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = {
      id: crypto.randomUUID(),
      username,
      email,
      passwordHash,
      createdAt: new Date().toISOString()
    };

    const { resource } = await usersContainer.items.create(newUser);

    const token = createToken(resource);

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: {
        id: resource.id,
        username: resource.username,
        email: resource.email
      }
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      message: "Failed to register account"
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const token = createToken(user);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Failed to login"
    });
  }
});

app.get("/api/sightings", async (req, res) => {
  try {
    const query = {
      query: "SELECT * FROM c ORDER BY c.createdAt DESC"
    };

    const { resources } = await sightingsContainer.items.query(query).fetchAll();

    const normalisedResources = resources.map((sighting) => ({
      ...sighting,
      status: normaliseStatus(sighting.status)
    }));

    res.json(normalisedResources);
  } catch (error) {
    console.error("Get sightings error:", error);
    res.status(500).json({
      message: "Failed to load sightings"
    });
  }
});

app.post("/api/sightings", requireAuth, upload.single("image"), async (req, res) => {
  try {
    const title = String(req.body.title || "").trim();
    const category = String(req.body.category || "").trim();
    const location = String(req.body.location || "").trim();
    const description = String(req.body.description || "").trim();
    const status = normaliseStatus(req.body.status);

    if (!title || !category || !location || !description) {
      return res.status(400).json({
        message: "Title, category, location, and description are required"
      });
    }

    const imageUrl = await uploadImageToAzure(req.file);

    const newSighting = {
      id: crypto.randomUUID(),
      title,
      category,
      location,
      description,
      status,
      imageUrl,
      ownerId: req.user.userId,
      ownerUsername: req.user.username,
      ownerEmail: req.user.email,
      createdAt: new Date().toISOString()
    };

    const { resource } = await sightingsContainer.items.create(newSighting);

    res.status(201).json(resource);
  } catch (error) {
    console.error("Create sighting error:", error);
    res.status(500).json({
      message: "Failed to create sighting"
    });
  }
});

app.put("/api/sightings/:id", requireAuth, upload.single("image"), async (req, res) => {
  try {
    const sightingId = req.params.id;
    const existingSighting = await findSightingById(sightingId);

    if (!existingSighting) {
      return res.status(404).json({
        message: "Sighting not found"
      });
    }

    if (existingSighting.ownerId !== req.user.userId) {
      return res.status(403).json({
        message: "You can only edit sightings that you uploaded"
      });
    }

    const title = String(req.body.title || "").trim();
    const category = String(req.body.category || "").trim();
    const location = String(req.body.location || "").trim();
    const description = String(req.body.description || "").trim();
    const status = normaliseStatus(req.body.status);

    if (!title || !category || !location || !description) {
      return res.status(400).json({
        message: "Title, category, location, and description are required"
      });
    }

    const uploadedImageUrl = await uploadImageToAzure(req.file);

    const updatedSighting = {
      ...existingSighting,
      title,
      category,
      location,
      description,
      status,
      imageUrl: uploadedImageUrl || existingSighting.imageUrl || "",
      updatedAt: new Date().toISOString()
    };

    if (existingSighting.category !== category) {
      await sightingsContainer.item(existingSighting.id, existingSighting.category).delete();
      const { resource } = await sightingsContainer.items.create(updatedSighting);
      return res.json(resource);
    }

    const { resource } = await sightingsContainer
      .item(existingSighting.id, existingSighting.category)
      .replace(updatedSighting);

    res.json(resource);
  } catch (error) {
    console.error("Update sighting error:", error);
    res.status(500).json({
      message: "Failed to update sighting"
    });
  }
});

app.delete("/api/sightings/:id", requireAuth, async (req, res) => {
  try {
    const sightingId = req.params.id;
    const existingSighting = await findSightingById(sightingId);

    if (!existingSighting) {
      return res.status(404).json({
        message: "Sighting not found"
      });
    }

    if (existingSighting.ownerId !== req.user.userId) {
      return res.status(403).json({
        message: "You can only delete sightings that you uploaded"
      });
    }

    await sightingsContainer.item(existingSighting.id, existingSighting.category).delete();

    res.json({
      message: "Sighting deleted successfully"
    });
  } catch (error) {
    console.error("Delete sighting error:", error);
    res.status(500).json({
      message: "Failed to delete sighting"
    });
  }
});

app.listen(PORT, () => {
  console.log(`ECO-WATCH API running at http://localhost:${PORT}`);
  console.log(`Image storage: Azure Blob Storage container "${blobContainerName}"`);
  console.log(`Metadata storage: Cosmos DB "${cosmosDatabaseName}" / "${sightingsContainerName}"`);
  console.log(`Users storage: Cosmos DB "${cosmosDatabaseName}" / "${usersContainerName}"`);
  console.log("Report statuses: Open, In Review, Resolved");
});
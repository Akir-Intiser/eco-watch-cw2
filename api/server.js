require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const multer = require("multer");
const path = require("path");
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
const cosmosContainerName = process.env.COSMOS_CONTAINER_NAME || "Sightings";

if (!blobConnectionString) {
  console.error("Missing AZURE_STORAGE_CONNECTION_STRING in api/.env");
  process.exit(1);
}

if (!cosmosEndpoint || !cosmosKey) {
  console.error("Missing COSMOS_ENDPOINT or COSMOS_KEY in api/.env");
  process.exit(1);
}

const blobServiceClient = BlobServiceClient.fromConnectionString(blobConnectionString);
const blobContainerClient = blobServiceClient.getContainerClient(blobContainerName);

const cosmosClient = new CosmosClient({
  endpoint: cosmosEndpoint,
  key: cosmosKey
});

const cosmosDatabase = cosmosClient.database(cosmosDatabaseName);
const cosmosContainer = cosmosDatabase.container(cosmosContainerName);

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

app.get("/", (req, res) => {
  res.json({
    message: "ECO-WATCH API is running",
    imageStorage: "Azure Blob Storage",
    metadataStorage: "Azure Cosmos DB",
    endpoints: [
      "GET /api/sightings",
      "POST /api/sightings",
      "PUT /api/sightings/:id",
      "DELETE /api/sightings/:id"
    ]
  });
});

app.get("/api/sightings", async (req, res) => {
  try {
    const query = {
      query: "SELECT * FROM c ORDER BY c.createdAt DESC"
    };

    const { resources } = await cosmosContainer.items.query(query).fetchAll();

    res.json(resources);
  } catch (error) {
    console.error("Get sightings error:", error);
    res.status(500).json({
      message: "Failed to load sightings"
    });
  }
});

app.post("/api/sightings", upload.single("image"), async (req, res) => {
  try {
    const imageUrl = await uploadImageToAzure(req.file);

    const newSighting = {
      id: crypto.randomUUID(),
      title: req.body.title,
      category: req.body.category,
      location: req.body.location,
      description: req.body.description,
      imageUrl: imageUrl,
      createdAt: new Date().toISOString()
    };

    const { resource } = await cosmosContainer.items.create(newSighting);

    res.status(201).json(resource);
  } catch (error) {
    console.error("Create sighting error:", error);
    res.status(500).json({
      message: "Failed to create sighting"
    });
  }
});

app.put("/api/sightings/:id", upload.single("image"), async (req, res) => {
  try {
    const sightingId = req.params.id;

    const query = {
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [
        {
          name: "@id",
          value: sightingId
        }
      ]
    };

    const { resources } = await cosmosContainer.items.query(query).fetchAll();

    if (resources.length === 0) {
      return res.status(404).json({
        message: "Sighting not found"
      });
    }

    const existingSighting = resources[0];
    const uploadedImageUrl = await uploadImageToAzure(req.file);

    const updatedSighting = {
      ...existingSighting,
      title: req.body.title,
      category: req.body.category,
      location: req.body.location,
      description: req.body.description,
      imageUrl: uploadedImageUrl || existingSighting.imageUrl || "",
      updatedAt: new Date().toISOString()
    };

    const { resource } = await cosmosContainer
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

app.delete("/api/sightings/:id", async (req, res) => {
  try {
    const sightingId = req.params.id;

    const query = {
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [
        {
          name: "@id",
          value: sightingId
        }
      ]
    };

    const { resources } = await cosmosContainer.items.query(query).fetchAll();

    if (resources.length === 0) {
      return res.status(404).json({
        message: "Sighting not found"
      });
    }

    const existingSighting = resources[0];

    await cosmosContainer.item(existingSighting.id, existingSighting.category).delete();

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
  console.log(`Metadata storage: Cosmos DB "${cosmosDatabaseName}" / "${cosmosContainerName}"`);
});
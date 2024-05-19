// backend/server.js
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 5001;


// Configure CORS
app.use(cors({
  origin: 'http://localhost:5173'
}));

const upload = multer({ dest: 'uploads/' });

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.post('/upload', upload.single('image'), async (req, res) => {
    try {
        const imagePath = req.file.path;

        // Read the image file
        const imageData = fs.readFileSync(imagePath);

        // Azure Computer Vision API request
        const response = await axios.post(`${process.env.AZURE_COMPUTER_VISION_ENDPOINT}/vision/v3.2/analyze`, imageData, {
            params: {
                visualFeatures: 'Tags',
            },
            headers: {
                'Content-Type': 'application/octet-stream',
                'Ocp-Apim-Subscription-Key': process.env.AZURE_COMPUTER_VISION_KEY,
            },
        });

        // Extract car type from tags
        const tags = response.data.tags;
        console.log("Tags received from Azure:", tags);
        const carType = tags.find(tag => tag.name === 'sedan' || tag.name === 'SUV');

        res.json({ carType: carType ? carType.name : 'Unknown' });
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred');
    }
});

// ============== PORT ============== //
// const PORT = process.env.PORT;
app
  .listen(PORT, () => {
    console.log(`Server is alive on http://localhost:${PORT}`);
  })
  .on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.log("PORT is already in use.");
    } else {
      console.log("Server Errors: ", error);
    }
  });


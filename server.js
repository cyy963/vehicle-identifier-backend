require('dotenv').config();
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();

// Set the port number to the value from the environment variable or default to 5001
const port = process.env.PORT || 5001;

// Configure CORS to allow requests from specified origins and methods
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*', // Allow all origins if not specified in environment variables
  methods: ['GET', 'POST'], // Allow GET and POST requests
  allowedHeaders: ['Content-Type'] // Allow Content-Type header
}));

// Determine the upload directory based on the environment
// Use /tmp for production (Azure Web App) and 'uploads/' for local development
const uploadDir = process.env.NODE_ENV === 'production' ? '/tmp/' : 'uploads/';

// Initialize multer with the upload directory configuration
const upload = multer({ dest: uploadDir });

// Middleware to clear uploads folder before uploading new file (only in local environment)
if (process.env.NODE_ENV === 'development') {
  const clearUploadsFolder = () => {
    // Read the files in the upload directory
    fs.readdir(uploadDir, (err, files) => {
      if (err) {
        console.error(`Unable to scan directory: ${err}`);
        return;
      }
      // Iterate over each file and delete it
      files.forEach((file) => {
        const filePath = path.join(uploadDir, file);
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(`Error deleting file ${filePath}:`, err);
          } else {
            console.log(`Deleted file: ${filePath}`);
          }
        });
      });
    });
  };
  // Use middleware to clear uploads folder before handling each request
  app.use((req, res, next) => {
    clearUploadsFolder();
    next();
  });
}

// Define root GET endpoint that returns a simple "Hello, World!" message
app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// Define a POST endpoint for handling file uploads
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    // Get the path of the uploaded file
    const imagePath = req.file.path;

    // Read the image file from the file system
    const imageData = fs.readFileSync(imagePath);

    // Make a POST request to the Azure Computer Vision API to analyze the image
    const response = await axios.post(`${process.env.AZURE_COMPUTER_VISION_ENDPOINT}vision/v3.2/analyze`, imageData, {
      params: {
        visualFeatures: 'Tags', // Request to analyze the image for tags
      },
      headers: {
        'Content-Type': 'application/octet-stream', // Set the content type to binary
        'Ocp-Apim-Subscription-Key': process.env.AZURE_COMPUTER_VISION_KEY, // Use the API key from environment variables
      },
    });

    // Log the tags received from Azure
    const tags = response.data.tags;
    console.log("Tags received from Azure:", tags);

    // Define a list of car types to match against the tags
    const carTypes = ['sedan', 'suv', 'coupa', 'convertible', 'hatchback', 'minivan', 'pickup truck', 'truck', 'station wagon', 'sports car', 'van', 'luxury car'];

    // Find the first tag that matches a car type
    const carType = tags.find(tag => carTypes.includes(tag.name));

    // Send the car type as the response (or 'Unknown' if no match is found)
    res.json({ carType: carType ? carType.name : 'Unknown' });
  } catch (error) {
    // Log any errors that occur and send a 500 status code with an error message
    console.error(error);
    res.status(500).send('An error occurred');
  }
});

// Start the Express server and listen on the specified port
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
}).on("error", (error) => {
  // Handle errors that occur when starting the server
  if (error.code === "EADDRINUSE") {
    console.log("PORT is already in use.");
  } else {
    console.log("Server Errors: ", error);
  }
});

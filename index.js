const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();



const app = express();
app.use(express.json());
const port = process.env.PORT || 5000;
const connectionString = process.env.MONGODB_URI;

async function createServer() {
  const client = new MongoClient(connectionString);

  try {
    await client.connect();
    console.log('Connected successfully to MongoDB');

    const db = client.db('surveyforms');
    const collection = db.collection('forms'); 
    
    app.get('/forms', async (req, res) => {
      try {
        const database = client.db("surveyforms");
        const collection = database.collection("forms");
        
        // Fetch all documents from the collection
        const forms = await collection.find({}).toArray();
        
        res.status(200).json(forms);
      } catch (error) {
        console.error("Error fetching forms:", error);
        res.status(500).json({ message: "Error fetching forms" });
      }
    });

    app.post('/forms/add', async (req, res) => {
      try {
        const database = client.db("surveyforms");
        const collection = database.collection("forms");
        
        // Get the form data from the request body
        const formData = req.body;
        
        // Insert the form data into the collection
        const result = await collection.insertOne(formData);
        
        res.status(201).json({
          message: "Form added successfully",
          insertedId: result.insertedId
        });
      } catch (error) {
        console.error("Error adding form:", error);
        res.status(500).json({ message: "Error adding form" });
      }
    });
    

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });

  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

createServer();

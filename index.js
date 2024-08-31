const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const cors = require('cors');
const jwt = require('jsonwebtoken');



const app = express();

app.use(cors());

app.use(express.json());
const port = process.env.PORT || 3000;
const connectionString = process.env.MONGODB_URI;

async function createServer() {
  const client = new MongoClient(connectionString);

  try {
    await client.connect();
    console.log('Connected successfully to MongoDB');

    const db = client.db('surveyforms');
     
    
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

    app.post('/api/register', async (req,res) => {
      const { name , password , email } = req.body;
      const hashedPassword = await bcrypt.hash(password,10);
      const newUser = { name, email , password : hashedPassword};

      try {
        await db.collection('users').insertOne(newUser);
        res.status(201).json({ message: "User registered successfully"});
      } catch (err) {
        res.status(500).json({ error: "Failed to register user"});
      }

    });

    app.post('/api/login', async (req, res) => {
      const {  email, password } = req.body;

      try {
        const user = await db.collection('users').findOne({
          email
        });

        if(!user) {
          return res.status(400).json({ error : "user not found "});
        }

        const isMatch = await bcrypt.compare(password , user.password);
        if (!isMatch) {
          return res.status(400).json({ error : 'Invalid credentialsn'});
        }

        const token = jwt.sign({ userId : user._id}, process.env.JWT_SECRET, { expiresIn : '1h'});
        res.json({ token });
      } catch (err) {
        res.status(500).json({ error : 'failed  to login'});
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

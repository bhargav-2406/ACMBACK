const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();
const cors = require('cors');
const multer = require('multer');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const port = process.env.PORT || 3000;
const connectionString = process.env.MONGODB_URI;
const storage = multer.memoryStorage(); // Store image in memory as Buffer
const upload = multer({ storage: storage });

async function createServer() {
  const client = new MongoClient(connectionString);

  try {
    await client.connect();
    console.log('Connected successfully to MongoDB');

    const db = client.db('surveyforms');
    const formsCollection = db.collection('forms');
    const eventsCollection = db.collection('events');
    const ticketCollection = db.collection('tickets')

    // Fetch all forms
    app.get('/forms', async (req, res) => {
      try {
        const forms = await formsCollection.find({}).toArray();
        res.status(200).json(forms);
      } catch (error) {
        console.error("Error fetching forms:", error);
        res.status(500).json({ message: "Error fetching forms" });
      }
    });

    // Add a new form
    app.post('/forms/add', async (req, res) => {
      try {
        const formData = req.body;
        const result = await formsCollection.insertOne(formData);
        res.status(201).json({
          message: "Form added successfully",
          insertedId: result.insertedId
        });
      } catch (error) {
        console.error("Error adding form:", error);
        res.status(500).json({ message: "Error adding form" });
      }
    });

    // Add a new event with image upload
    app.post('/events/add', upload.single('image'), async (req, res) => {
      try {
        const imageBuffer = req.file ? req.file.buffer : null;
        const { eventName, eventDate, eventTime, eventLocation, eventDescription } = req.body;

        const eventDocument = {
          eventName,
          eventDate,
          eventTime,
          eventLocation,
          eventDescription,
          image: imageBuffer
        };

        const result = await eventsCollection.insertOne(eventDocument);
        res.status(200).json({ message: 'Event added successfully', eventId: result.insertedId });
      } catch (err) {
        console.error("Error adding event:", err);
        res.status(500).json({ message: 'Failed to add event' });
      }
    });

    // Fetch all events
    app.get('/events', async (req, res) => {
      try {
        const database = client.db("surveyforms");
        const collection = database.collection("events");
    
        // Fetch all documents from the collection
        const events = await collection.find({}).toArray();
    
        // Convert the image buffer to Base64 for each event
        const eventsWithImages = events.map(event => {
          if (event.image) {
            // Convert Buffer to Base64 and include the MIME type (assuming JPEG)
            event.image = `data:image/jpeg;base64,${event.image.toString('base64')}`;
          }
          return event;
        });
    
        res.status(200).json(eventsWithImages);
      } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json({ message: "Error fetching events" });
      }
    });

    app.post('/tickets/add', async (req, res) => {
      try {
        const formData = req.body;
        const result = await ticketCollection.insertOne(formData);
        res.status(201).json({
          message: "Ticket added successfully",
          insertedId: result.insertedId
        });
      } catch (error) {
        console.error("Error adding ticket:", error);
        res.status(500).json({ message: "Error adding ticket" });
      }
    });

    app.get('/tickets', async (req, res) => {
      try {
        const forms = await ticketCollection.find({}).toArray();
        res.status(200).json(forms);
      } catch (error) {
        console.error("Error fetching tickets:", error);
        res.status(500).json({ message: "Error fetching tickets" });
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

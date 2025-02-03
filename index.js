const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const bcrypt = require("bcryptjs");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const twilio = require("twilio");

const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const port = process.env.PORT || 3000;
const connectionString = process.env.MONGODB_URI;
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function createServer() {
  const client = new MongoClient(connectionString);

  try {
    await client.connect();
    console.log("Connected successfully to MongoDB");

    const surveyDB = client.db("surveyforms");
    const ticketCollection = surveyDB.collection("tickets");
    const eventsCollection = surveyDB.collection("events");

    app.get("/forms", async (req, res) => {
      try {
        const collection = surveyDB.collection("forms");

        const forms = await collection.find({}).toArray();

        res.status(200).json(forms);
      } catch (error) {
        console.error("Error fetching forms:", error);
        res.status(500).json({ message: "Error fetching forms" });
      }
    });

    app.post("/forms/add", async (req, res) => {
      try {
        const collection = surveyDB.collection("forms");

        const formData = req.body;

        const result = await collection.insertOne(formData);

        res.status(201).json({
          message: "Form added successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error adding form:", error);
        res.status(500).json({ message: "Error adding form" });
      }
    });

    app.post("/events/add", upload.single("image"), async (req, res) => {
      try {
        const imageBuffer = req.file ? req.file.buffer : null;
        const {
          eventName,
          eventDate,
          eventTime,
          eventLocation,
          eventDescription,
        } = req.body;

        const eventDocument = {
          eventName,
          eventDate,
          eventTime,
          eventLocation,
          eventDescription,
          image: imageBuffer,
        };

        const result = await eventsCollection.insertOne(eventDocument);
        res.status(200).json({
          message: "Event added successfully",
          eventId: result.insertedId,
        });
      } catch (err) {
        console.error("Error adding event:", err);
        res.status(500).json({ message: "Failed to add event" });
      }
    });

    app.delete("/events/:id", async (req, res) => {
      try {
        const eventId = new ObjectId(req.params.id);
        const result = await eventsCollection.deleteOne({ _id: eventId });
        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Event not found" });
        }
        res.status(200).json({ message: "Event deleted successfully" });
      } catch (error) {
        console.error("Error deleting event:", error);
        res.status(500).json({ message: "Error deleting event" });
      }
    });

    app.get("/events", async (req, res) => {
      try {
        const collection = surveyDB.collection("events");
        const events = await collection.find({}).toArray();

        const eventsWithImages = events.map((event) => {
          if (event.image) {
            event.image = `data:image/jpeg;base64,${event.image.toString(
              "base64"
            )}`;
          }
          return event;
        });

        res.status(200).json(eventsWithImages);
      } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json({ message: "Error fetching events" });
      }
    });

    // Add these endpoints to your Express server

    app.post("/carousel/add", upload.single("image"), async (req, res) => {
      try {
        const imageBuffer = req.file ? req.file.buffer : null;
        const { description } = req.body;

        if (!imageBuffer) {
          return res.status(400).json({ message: "Image is required" });
        }

        const carouselDocument = {
          image: imageBuffer,
          description: description || "Carousel Image",
          createdAt: new Date(),
        };

        const collection = surveyDB.collection("carousel");
        const result = await collection.insertOne(carouselDocument);

        res.status(200).json({
          message: "Carousel image added successfully",
          imageId: result.insertedId,
        });
      } catch (err) {
        console.error("Error adding carousel image:", err);
        res.status(500).json({ message: "Failed to add carousel image" });
      }
    });

    app.get("/carousel", async (req, res) => {
      try {
        const collection = surveyDB.collection("carousel");
        const images = await collection
          .find({})
          .sort({ createdAt: -1 })
          .toArray();

        const imagesWithBase64 = images.map((image) => ({
          _id: image._id,
          description: image.description,
          image: `data:image/jpeg;base64,${image.image.toString("base64")}`,
          createdAt: image.createdAt,
        }));

        res.status(200).json(imagesWithBase64);
      } catch (error) {
        console.error("Error fetching carousel images:", error);
        res.status(500).json({ message: "Error fetching carousel images" });
      }
    });

    app.delete("/carousel/:id", async (req, res) => {
      try {
        const imageId = new ObjectId(req.params.id);
        const collection = surveyDB.collection("carousel");

        const result = await collection.deleteOne({ _id: imageId });

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Carousel image not found" });
        }

        res
          .status(200)
          .json({ message: "Carousel image deleted successfully" });
      } catch (error) {
        console.error("Error deleting carousel image:", error);
        res.status(500).json({ message: "Error deleting carousel image" });
      }
    });

    app.post("/tickets/add", async (req, res) => {
      try {
        const formData = req.body;
        const result = await ticketCollection.insertOne(formData);
        if (formData.mobile) {
          try {
            const message = await twilioClient.messages.create({
              body: `Dear ${formData.name}, your booking at ${formData.temple} has been confirmed for ${formData.date} at ${formData.time}. Thank you for your support of the Kaliyampoondi Village Development Trust.`,
              from: process.env.TWILIO_PHONE_NUMBER,
              to: "+91" + formData.mobile,
            });
            console.log("SMS sent:", message.sid);
          } catch (smsError) {
            console.error("Failed to send SMS:", smsError);
          }
        }

        res.status(201).json({
          message: "Ticket added successfully and SMS sent!",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error adding ticket:", error);
        res.status(500).json({ message: "Error adding ticket" });
      }
    });

    app.get("/tickets", async (req, res) => {
      try {
        const forms = await ticketCollection.find({}).toArray();
        res.status(200).json(forms);
      } catch (error) {
        console.error("Error fetching tickets:", error);
        res.status(500).json({ message: "Error fetching tickets" });
      }
    });

    app.post("/api/admin/register", async (req, res) => {
      const { name, password, email } = req.body;

      if (!name || !password || !email) {
        return res.status(400).json({ error: "All fields are required" });
      }

      try {
        const existingUser = await surveyDB
          .collection("useradmin")
          .findOne({ email });
        if (existingUser) {
          return res.status(400).json({ error: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { name, email, password: hashedPassword };
        await surveyDB.collection("useradmin").insertOne(newUser);
        res.status(201).json({ message: "Admin created successfully" });
      } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Failed to register user" });
      }
    });

    app.post("/api/admin/login", async (req, res) => {
      const { email, password } = req.body;
      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Email and password are required" });
      }

      try {
        const user = await surveyDB.collection("useradmin").findOne({ email });
        if (!user) {
          return res.status(400).json({ error: "User not found" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(400).json({ error: "Invalid credentials" });
        }
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
          expiresIn: "1h",
        });
        res.json({ token, userId: user._id, name: user.name });
      } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Failed to login" });
      }
    });

    app.post("/api/register", async (req, res) => {
      const { name, password, email } = req.body;

      if (!name || !password || !email) {
        return res.status(400).json({ error: "All fields are required" });
      }

      try {
        const existingUser = await surveyDB
          .collection("users")
          .findOne({ email });
        if (existingUser) {
          return res.status(400).json({ error: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { name, email, password: hashedPassword };

        await surveyDB.collection("users").insertOne(newUser);
        res.status(201).json({ message: "User registered successfully" });
      } catch (err) {
        console.error("Registration error:", err);
        res.status(500).json({ error: "Failed to register user" });
      }
    });

    app.post("/api/login", async (req, res) => {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Email and password are required" });
      }

      try {
        const user = await surveyDB.collection("users").findOne({ email });

        if (!user) {
          return res.status(400).json({ error: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(400).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
          expiresIn: "1h",
        });
        res.json({ token, userId: user._id, name: user.name });
      } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Failed to login" });
      }
    });

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}

createServer();

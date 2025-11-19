 34th Street 🌍 
A place where verified African graduate students connect, collaborate, and build community across the globe.

** Overview
**
34th Street is a mobile social app built with **React Native** and **Node.js, designed for verified African graduate students at top institutions worldwide. Users can build rich profiles, chat privately, view community members, and connect with others in a safe, identity-verified space.

 Features

- 🔐 **Authentication & JWT Tokens**
- 🧑🏿‍🤝‍🧑🏽 **Verified Member Directory**
- 💬 **Private Messaging** (with read receipts & typing indicators)
- 📸 **Photo Uploads & Profile Gallery**
- ✍🏽 **Rich Profile Setup** (education, interests, origin, location, fun facts)
- 🌍 **Responsive & Modern UI**
- ⚙️ **Node.js/Express Backend with MongoDB**
- ☁️ **Cloudinary Image Hosting**

## 🛠️ Tech Stack

### Frontend
- React Native (with Expo)
- React Navigation
- Axios
- Lottie Animations
- Socket.IO Client

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- Cloudinary (for image storage)
- Socket.IO (for real-time messaging)

## 📸 Screenshots

> _Add screenshots or a short screen recording of your app here to showcase the UI/UX_

## 📦 Setup Instructions

### 1. Clone the repo

```bash
git clone https://github.com/your-username/34thstreet.git
cd 34thstreet

** Install dependencies
**
npm install
# or
yarn

**Environment Variables
**
Create a .env file for backend with:
PORT=4000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

For frontend, make sure to point all API requests to the backend server IP (e.g., http://192.168.0.169:4000).

**Run App
Backend:**
bash
Copy
Edit

Frontend (with Expo):
cd frontend
npx expo start

🧪 Status
✅ MVP complete
🔜 Upcoming Features:

Group chats / public chatrooms

Admin dashboard

Event-based meetups

Push notifications

🤝 Contributing
Contributions are welcome! If you’d like to suggest a feature or fix a bug, feel free to fork the repo and create a pull request.

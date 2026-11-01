
<div align="center">

# FaceVision AI

### Intelligent Face Detection & Computer Vision Platform

A modern computer vision application built with OpenCV, Python, Flask and React.

<br/>

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![OpenCV](https://img.shields.io/badge/OpenCV-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)

<br/>

**Upload. Detect. Analyse.**

</div>

---

## Overview

**FaceVision AI** is a web-based computer vision platform that detects human faces in images using OpenCV.

The application allows users to upload photographs or capture images through a webcam, process them using a Python-based computer vision backend, and visualise detection results through an interactive React interface.

Beyond basic face detection, the project explores image processing, API communication, backend integration and performance measurement.

## Features

| Feature | Description |
|:---|:---|
| Image Detection | Upload photographs and detect faces |
| Webcam Capture | Capture images directly through the browser |
| Multiple Face Detection | Detect multiple faces in a single image |
| Bounding Box Visualisation | Highlight detected faces |
| Detection Analytics | Display face count and processing time |
| Processed Image Export | Download the resulting image |
| Detection History | Maintain records of previous detections |

## Preview

<!-- Add screenshots of your application here -->

<div align="center">

| Image Upload | Detection Results |
|:---:|:---:|
| Add screenshot here | Add screenshot here |

</div>

## Tech Stack

**Frontend**
- React.js
- Vite
- Tailwind CSS
- Axios
- Lucide React

**Backend**
- Python
- Flask
- Flask-CORS
- REST APIs

**Computer Vision**
- OpenCV
- Haar Cascade Classifier
- NumPy

**Database**
- SQLite

## Architecture

```text
                  USER
                   |
                   v
             REACT FRONTEND
                   |
           Image / Webcam Input
                   |
                   v
              FLASK API
                   |
                   v
           OPENCV PROCESSING
                   |
          +--------+--------+
          |                 |
          v                 v
     Face Detection    Image Processing
          |                 |
          +--------+--------+
                   |
                   v
           DETECTION RESULTS
                   |
                   v
            REACT DASHBOARD
```

## Project Structure

```text
FaceVisionAI/
|
|-- backend/
|   |-- app.py
|   |-- requirements.txt
|   |-- ...
|
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- pages/
|   |   |-- App.jsx
|   |   |-- main.jsx
|   |
|   |-- package.json
|
|-- .gitignore
|-- README.md
```

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js and npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Yashika01234/-FaceVision-AI-.git

cd -FaceVision-AI-
```

### 2. Configure the backend

```bash
cd backend

python -m venv venv

venv\Scripts\activate

pip install -r requirements.txt
```

Start the backend:

```bash
python app.py
```

Backend URL:

```text
http://127.0.0.1:5000
```

### 3. Configure the frontend

Open another terminal:

```bash
cd frontend

npm install

npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

## How It Works

1. The user uploads an image or captures one through the webcam.
2. React sends the image to the Flask backend.
3. OpenCV decodes the uploaded image.
4. The image is converted into grayscale.
5. Haar Cascade identifies potential facial regions.
6. Bounding boxes are drawn around detected faces.
7. The backend returns the processed image and detection statistics.
8. React displays the final output.

## API Reference

| Method | Endpoint | Purpose |
|:---:|:---|:---|
| GET | `/` | Backend health check |
| POST | `/api/detect` | Process an image and detect faces |

### Detection Request

```http
POST /api/detect
Content-Type: multipart/form-data
```

Request parameter:

```text
image: uploaded image file
```

Response metadata:

```text
X-Face-Count
X-Processing-Time
```

The processed image is returned as a JPEG response.

## Engineering Concepts

- Computer Vision
- Digital Image Processing
- Haar Cascade Classification
- REST API Design
- Client-Server Communication
- HTTP File Handling
- Image Encoding and Decoding
- Backend Performance Measurement
- Frontend and Backend Integration

## Roadmap

- [x] Flask backend
- [x] OpenCV face detection
- [x] Image upload API
- [ ] Webcam integration
- [ ] Detection history dashboard
- [ ] Advanced face detection models
- [ ] Real-time video processing
- [ ] Cloud deployment

## Future Scope

- Deep-learning-based face detection using YuNet.
- Real-time video analytics.
- Face anonymisation and privacy protection.
- Detection performance benchmarking.
- Docker-based deployment.

---

<div align="center">

### Built with OpenCV, Python & React

**FaceVision AI**

*Making Computer Vision Interactive.*

</div>

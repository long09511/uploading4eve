# Global Learning Document Sharing

A full-stack web application for sharing learning documents globally.

## Structure
- `frontend/`: Vanilla JS, HTML, CSS for the client-side.
- `backend/`: Node.js with Express for the server-side, using MongoDB and AWS S3.

## Setup
1. Install Node.js.
2. In `backend/`, run `npm install`.
3. Set environment variables in `.env` (example below).
4. Run `npm start` in `backend/`.

## .env Example
MONGODB_URI=mongodb://localhost:27017/documentdb
AWS_ACCESS_KEY_ID=yourkey
AWS_SECRET_ACCESS_KEY=yoursecret
AWS_REGION=us-east-1
S3_BUCKET=yourbucket
JWT_SECRET=yourjwtsecret

## Deployment
Deploy backend to Heroku/AWS, frontend served by backend. Use MongoDB Atlas for DB, create S3 bucket.

## Features
- User registration/login.
- Upload documents to S3.
- List and download documents.
- Multi-language, dark/light theme.

For production, add more security, error handling, etc.
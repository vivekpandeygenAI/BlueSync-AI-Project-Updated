# Frontend Setup Instructions

## Prerequisites
- Node.js (v16 or higher)
- npm or yarn

## Setup Steps

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install React dependencies:
```bash
npm install
```

3. Start the React development server:
```bash
npm start
```

3. In a separate terminal, start the FastAPI backend:
```bash
uvicorn app:app --reload --port 8000
```

## Usage

1. Open http://localhost:3000 in your browser
2. Upload a requirements document (PDF, DOCX, XML, HTML, MD, TXT)
3. Extract requirements from the document
4. Generate test cases for each requirement
5. View the generated test cases with compliance information

## File Structure

```
frontend/
├── src/
│   ├── App.js - Main React component
│   ├── App.tsx - TypeScript React component
│   ├── App.css - Styling
│   └── index.js - React entry point
├── public/
│   └── index.html - HTML template
└── package.json - Dependencies and scripts
```
### Step 1: Set Up Your Environment

Make sure you have Node.js and npm (Node Package Manager) installed on your machine. You can download them from [nodejs.org](https://nodejs.org/).

### Step 2: Create a New React Application

Open your terminal and run the following command to create a new React application:

```bash
npx create-react-app my-react-app
```

Replace `my-react-app` with your desired project name.

### Step 3: Navigate to Your Project Directory

Once the setup is complete, navigate into your project directory:

```bash
cd my-react-app
```

### Step 4: Project Structure

After running the command, your project structure will look something like this:

```
my-react-app/
├── node_modules/
├── public/
│   ├── favicon.ico
│   ├── index.html
│   ├── logo192.png
│   ├── logo512.png
│   ├── manifest.json
│   └── robots.txt
├── src/
│   ├── App.css
│   ├── App.js
│   ├── App.test.js
│   ├── index.css
│   ├── index.js
│   ├── logo.svg
│   └── reportWebVitals.js
│   └── setupTests.js
├── .gitignore
├── package.json
├── README.md
└── yarn.lock (or package-lock.json)
```

### Step 5: Modify the Code

You can start modifying the code in the `src` folder. Here’s a simple example of how to modify `App.js` to create a basic component.

#### Edit `src/App.js`

Replace the contents of `App.js` with the following code:

```javascript
import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to My React App</h1>
        <p>This is a simple React application.</p>
      </header>
    </div>
  );
}

export default App;
```

### Step 6: Start the Development Server

To see your application in action, start the development server by running:

```bash
npm start
```

This will open your default web browser and navigate to `http://localhost:3000`, where you should see your React application running.

### Step 7: Additional Folder Structure (Optional)

As your application grows, you might want to organize your components, styles, and assets better. Here’s an example of a more organized folder structure:

```
my-react-app/
├── public/
├── src/
│   ├── components/
│   │   ├── Header.js
│   │   └── Footer.js
│   ├── pages/
│   │   ├── Home.js
│   │   └── About.js
│   ├── styles/
│   │   ├── App.css
│   │   └── Header.css
│   ├── utils/
│   │   └── api.js
│   ├── App.js
│   ├── index.js
│   └── ...
```

### Step 8: Install Additional Dependencies (Optional)

You might want to install additional libraries for routing, state management, etc. For example, to add React Router for navigation, you can run:

```bash
npm install react-router-dom
```

### Conclusion

You now have a basic React application set up with a simple folder structure. You can start building your application by adding components, pages, and styles as needed. Happy coding!
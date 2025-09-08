const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8000;

// MIME types for different file extensions
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;
  
  console.log(`Request for ${pathname}`);

  // Handle root path
  if (pathname === '/') {
    pathname = '/feed.html';
  }
  
  // Handle /feed route
  if (pathname === '/feed') {
    pathname = '/feed.html';
  }
  
  // Check if it's an article route (any path without a file extension that's not /feed)
  const hasExtension = path.extname(pathname) !== '';
  if (!hasExtension && pathname !== '/feed.html' && pathname !== '/') {
    // This is likely an article slug, serve article.html
    console.log(`Serving article.html for slug: ${pathname}`);
    
    fs.readFile(path.join(__dirname, 'article.html'), 'utf8', (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading article page');
        return;
      }
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    });
    return;
  }
  
  // For regular files, serve them normally
  let filePath = path.join(__dirname, pathname);
  
  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
      return;
    }
    
    // Get the file extension and set content type
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🚀 Server is running at http://localhost:${PORT}       ║
║                                                        ║
║   Test URLs:                                           ║
║   • Feed:    http://localhost:${PORT}/feed               ║
║   • Article: http://localhost:${PORT}/car-care-myths-draining-wallet
║                                                        ║
║   Press Ctrl+C to stop the server                     ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
  `);
});
// Generate PNG icons from SVG for PWA
function generateIcons() {
    const svgString = `
<svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" fill="#2d4a2b" rx="24"/>
  <rect x="16" y="120" width="160" height="56" fill="#8B4513" rx="8"/>
  <ellipse cx="50" cy="140" rx="8" ry="20" fill="#FF8C00"/>
  <ellipse cx="70" cy="140" rx="8" ry="20" fill="#FF8C00"/>
  <ellipse cx="90" cy="140" rx="8" ry="20" fill="#FF8C00"/>
  <rect x="45" y="120" width="3" height="15" fill="#228B22" rx="1"/>
  <rect x="48" y="118" width="3" height="17" fill="#228B22" rx="1"/>
  <rect x="51" y="120" width="3" height="15" fill="#228B22" rx="1"/>
  <rect x="65" y="120" width="3" height="15" fill="#228B22" rx="1"/>
  <rect x="68" y="118" width="3" height="17" fill="#228B22" rx="1"/>
  <rect x="71" y="120" width="3" height="15" fill="#228B22" rx="1"/>
  <rect x="85" y="120" width="3" height="15" fill="#228B22" rx="1"/>
  <rect x="88" y="118" width="3" height="17" fill="#228B22" rx="1"/>
  <rect x="91" y="120" width="3" height="15" fill="#228B22" rx="1"/>
  <circle cx="130" cy="50" r="16" fill="#FFDBA4"/>
  <ellipse cx="130" cy="40" rx="18" ry="12" fill="#228B22"/>
  <rect x="118" y="58" width="24" height="32" fill="#8B4513" rx="4"/>
  <rect x="108" y="62" width="12" height="20" fill="#FFDBA4" rx="6"/>
  <rect x="132" y="62" width="12" height="20" fill="#FFDBA4" rx="6"/>
  <rect x="122" y="85" width="8" height="25" fill="#4169E1" rx="4"/>
  <rect x="132" y="85" width="8" height="25" fill="#4169E1" rx="4"/>
  <circle cx="145" cy="75" r="3" fill="#87CEEB" opacity="0.8"/>
  <circle cx="150" cy="70" r="2" fill="#87CEEB" opacity="0.6"/>
  <circle cx="155" cy="75" r="2" fill="#87CEEB" opacity="0.6"/>
  <circle cx="148" cy="80" r="2" fill="#87CEEB" opacity="0.6"/>
  <ellipse cx="40" cy="80" rx="12" ry="8" fill="#D2691E"/>
  <circle cx="50" cy="75" r="8" fill="#D2691E"/>
  <ellipse cx="25" cy="80" rx="10" ry="6" fill="#D2691E"/>
  <circle cx="48" cy="73" r="2" fill="#000"/>
  <circle cx="52" cy="73" r="2" fill="#000"/>
</svg>`;

    // Create blob and object URL
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    // Create image element
    const img = new Image();
    img.onload = function() {
        // Generate 192x192 icon
        const canvas192 = document.createElement('canvas');
        canvas192.width = 192;
        canvas192.height = 192;
        const ctx192 = canvas192.getContext('2d');
        ctx192.drawImage(img, 0, 0, 192, 192);
        
        // Generate 512x512 icon
        const canvas512 = document.createElement('canvas');
        canvas512.width = 512;
        canvas512.height = 512;
        const ctx512 = canvas512.getContext('2d');
        ctx512.imageSmoothingEnabled = true;
        ctx512.imageSmoothingQuality = 'high';
        ctx512.drawImage(img, 0, 0, 512, 512);
        
        // Convert to blobs and download (for development)
        canvas192.toBlob(blob => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'icon-192.png';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
        
        canvas512.toBlob(blob => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'icon-512.png';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
        
        URL.revokeObjectURL(url);
    };
    img.src = url;
}

// Call this function once to generate icons (can be removed after generating)
// generateIcons();

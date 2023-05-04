function initInputResizing() {
    // Create a handle for resizing the input container
    const inputContainer = document.getElementById('input-container')
    const inputResizeHandle = document.getElementById('input-resize-handle')
  
    // Add an event listener for mouse down on the resize handle
    inputResizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();

      const startY = e.clientY;
      const startHeight = inputContainer.style.height ? parseInt(inputContainer.style.height) : parseInt(getComputedStyle(inputContainer).height);
  
      window.addEventListener('mousemove', resizeInput);
      window.addEventListener('mouseup', stopResizeInput);
  
      function resizeInput(e) {
        const delta =  startY - e.clientY;
        inputContainer.style.height = `${startHeight + delta}px`;
      }
  
      function stopResizeInput() {
        window.removeEventListener('mousemove', resizeInput);
        window.removeEventListener('mouseup', stopResizeInput);
      }
    });
  }
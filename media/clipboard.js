function initClipboard(codeBlocks) {
    codeBlocks.forEach(block => {
      const copyButton = document.createElement('button');
      copyButton.classList.add('copy-button');
      copyButton.innerText = 'Copy';
      block.appendChild(copyButton);
  
      copyButton.addEventListener('click', () => {
        // Copy the message text to the clipboard
        navigator.clipboard.writeText(block.textContent);
  
        // Change the button text temporarily to show that the text has been copied
        copyButton.textContent = 'Copied!';
  
        // Reset the button text after a short delay
        setTimeout(() => {
          copyButton.textContent = '';
          const copyIcon = document.createElement('i');
          copyIcon.classList.add('fas', 'fa-copy');
          copyButton.appendChild(copyIcon);
        }, 1000);
      });
    });
  }
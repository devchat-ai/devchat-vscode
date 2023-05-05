// clipboard.js


function initClipboard(codeBlocks, onApplyButtonClick, onApplyCodeButtonClick, onApplyCodeFileButtonClick) {
    codeBlocks.forEach(block => {
      const contentSpan = document.createElement('span');
      contentSpan.innerHTML = block.innerHTML;
      block.innerHTML = '';
      block.appendChild(contentSpan);
      
      const copyButton = document.createElement('button');
      copyButton.classList.add('copy-button');
      copyButton.innerText = 'Copy';
      block.appendChild(copyButton);
  
      copyButton.addEventListener('click', () => {
        // Copy the message text to the clipboard
        navigator.clipboard.writeText(contentSpan.textContent);
  
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

      // Add 'Apply' button
      const applyButton = document.createElement('button');
      applyButton.classList.add('apply-button');
      applyButton.innerText = 'Show Diff';
      block.appendChild(applyButton);
  
      applyButton.addEventListener('click', () => {
        onApplyButtonClick(contentSpan.textContent);
      });

      // Add 'Apply' button
      const applyCodeButton = document.createElement('button');
      applyCodeButton.classList.add('apply-button');
      applyCodeButton.innerText = 'Insert Code';
      block.appendChild(applyCodeButton);
  
      applyCodeButton.addEventListener('click', () => {
        onApplyCodeButtonClick(contentSpan.textContent);
      });

      // Add 'Apply' button
      const applyCodeFileButton = document.createElement('button');
      applyCodeFileButton.classList.add('apply-button');
      applyCodeFileButton.innerText = 'Relace File';
      block.appendChild(applyCodeFileButton);
  
      applyCodeFileButton.addEventListener('click', () => {
        onApplyCodeFileButtonClick(contentSpan.textContent);
      });
    });
  }
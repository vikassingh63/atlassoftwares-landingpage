  document.querySelectorAll('.faq-question').forEach(button => {
    button.addEventListener('click', () => {
      const currentItem = button.parentElement;
      const isActive = currentItem.classList.contains('active');
      
      // Optional: Close other open FAQ elements to maintain dashboard scale
      document.querySelectorAll('.faq-item').forEach(item => item.classList.remove('active'));
      
      if (!isActive) {
        currentItem.classList.add('active');
      }
    });
  });
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

  const toggleBtn = document.getElementById('menu-toggle');
  const topnavMenu = document.querySelector('.topnav');

  if (toggleBtn && topnavMenu) {
    // 1. Button par click karne par menu toggle hoga
    toggleBtn.addEventListener('click', function(e) {
      e.stopPropagation(); // Click event ko body tak jaane se rokega
      topnavMenu.classList.toggle('active');
    });

    // 2. Body par kahin bhi click karne par menu close ho jayega
    document.addEventListener('click', function(e) {
      // Agar click menu ke andar ya toggle button par nahi hua hai, toh close kar do
      if (!topnavMenu.contains(e.target) && e.target !== toggleBtn) {
        topnavMenu.classList.remove('active');
      }
    });

    // 3. Menu ke andar ke links par click karne par bhi menu close ho jaye
    const navLinks = topnavMenu.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        topnavMenu.classList.remove('active');
      });
    });
  }
const menuButtons = document.querySelectorAll('.menu-item');
const panels = document.querySelectorAll('.content');
const title = document.getElementById('panel-title');
const amountInput = document.getElementById('demo-amount');
const artistValue = document.getElementById('artist-value');
const stateValue = document.getElementById('state-value');
const producerValue = document.getElementById('producer-value');

function updateDemo() {
  const value = Number(amountInput.value) || 0;
  artistValue.textContent = `${(value * 0.97).toFixed(2)} AVAX`;
  stateValue.textContent = `${(value * 0.02).toFixed(2)} AVAX`;
  producerValue.textContent = `${(value * 0.01).toFixed(2)} AVAX`;
}

menuButtons.forEach(button => {
  button.addEventListener('click', () => {
    menuButtons.forEach(item => item.classList.remove('active'));
    button.classList.add('active');

    const panelId = button.dataset.panel;
    panels.forEach(panel => {
      panel.classList.toggle('active', panel.id === panelId);
    });

    title.textContent = button.textContent.trim();
  });
});

amountInput.addEventListener('input', updateDemo);
updateDemo();

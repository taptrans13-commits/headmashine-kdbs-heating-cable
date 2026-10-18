document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('kdbs-cookie-choice')) {
    const box = document.createElement('div');
    box.className = 'cookie-notice';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Информация о хранении выбора');
    box.innerHTML = '<p>На сайте нет аналитики и рекламных cookie. С вашего разрешения сохраним только выбор о показе этого уведомления в браузере. <a href="cookies.html">Подробнее</a></p><div><button type="button" data-save>Сохранить выбор</button><button type="button" class="cookie-settings" data-close>Без сохранения</button></div>';
    document.body.append(box);
    box.querySelector('[data-save]').addEventListener('click', () => { localStorage.setItem('kdbs-cookie-choice', 'accepted'); box.remove(); });
    box.querySelector('[data-close]').addEventListener('click', () => box.remove());
  }
  const form = document.querySelector('#requestForm');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const message = `Имя: ${data.get('name')}\nКонтакт: ${data.get('contact')}\nЗаявка: ${data.get('request')}`;
    window.location.href = `mailto:head-s@yandex.ru?subject=${encodeURIComponent('Запрос на КДБС')}&body=${encodeURIComponent(message)}`;
  });
});

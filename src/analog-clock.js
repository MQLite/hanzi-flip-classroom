import './analog-clock.css';

export function mountAnalogClock(clock) {
  const numbers = clock.querySelector('.clock-numbers');
  const hourHand = clock.querySelector('[data-hand=hour]');
  const minuteHand = clock.querySelector('[data-hand=minute]');
  for (let hour = 1; hour <= 12; hour++) {
    const angle = hour * Math.PI / 6;
    const number = document.createElement('span');
    number.textContent = hour;
    number.style.left = (50 + 39 * Math.sin(angle)) + '%';
    number.style.top = (50 - 39 * Math.cos(angle)) + '%';
    numbers.append(number);
  }

  return ([hour, minute]) => {
    hourHand.style.setProperty('--angle', ((hour % 12) + minute / 60) * 30 + 'deg');
    minuteHand.style.setProperty('--angle', minute * 6 + 'deg');
    const hourPosition = minute ? hour + '和' + (hour % 12 + 1) + '之间' : '数字' + hour;
    const minutePosition = minute ? minute / 5 : 12;
    clock.setAttribute('aria-label', '指针时钟。时针指向' + hourPosition + '，分针指向数字' + minutePosition + '。');
  };
}

import Plot from './Plot.js';

const xhr = new XMLHttpRequest();

xhr.onreadystatechange = function () {
    if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
        const charts = JSON.parse(xhr.responseText);
        
        let plot = new Plot({
            chart : charts[0],
            appendTo : 'main',
            name: 'Followers'
        });
        plot.render();
    }
};

xhr.open('GET', '/contest/data/chart_data.json');
xhr.send();

const footer = document.querySelector('.footer');
footer.addEventListener('pointerdown', () => {
    if (/Night/.test(footer.innerHTML)) {
        document.body.classList.add('c-night');
        footer.innerHTML = 'Switch to Day Mode';
    } else {
        document.body.classList.remove('c-night');
        footer.innerHTML = 'Switch to Night Mode';
    }
});

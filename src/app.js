import Plot from './Plot.js';

const xhr = new XMLHttpRequest();

xhr.onreadystatechange = function () {
    if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
        const charts = JSON.parse(xhr.responseText);
        
        charts.map(c => {
            let plot = new Plot({
                chart : c,
                appendTo : 'main',
                name: 'Followers'
            });
            plot.render();
        });
    }
};

xhr.open('GET', '/contest/data/chart_data.json');
xhr.send();

const footer = document.querySelector('.footer'),
    p = footer.firstChild;

footer.addEventListener('pointerdown', () => {
    if (/Night/.test(p.innerHTML)) {
        document.body.classList.add('c-night');
        p.innerHTML = 'Switch to Day Mode';
    } else {
        document.body.classList.remove('c-night');
        p.innerHTML = 'Switch to Night Mode';
    }
});

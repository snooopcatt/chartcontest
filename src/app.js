import Plot from './Plot.js';

const xhr = new XMLHttpRequest();

xhr.onreadystatechange = function () {
    if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
        const charts = JSON.parse(xhr.responseText);
        
        let plot = new Plot({
            chart : charts[0],
            appendTo : 'main'
        });
        plot.render();
    }
};

xhr.open('GET', '/contest/data/chart_data.json');
xhr.send();
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatDate(date, includeDay = false) {
    return `${includeDay ? dayNames[date.getDay()] + ', ' : ''}${monthNames[date.getMonth()]} ${date.getDate()}`;
}
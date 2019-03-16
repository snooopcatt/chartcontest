const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Dec']

export function formatDate(date) {
    return `${monthNames[date.getMonth()]} ${date.getDate()}`;
}
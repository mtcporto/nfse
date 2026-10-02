// Escape values before inserting them into XML or HTML text/attributes.
function escapeMarkup(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
    })[character]);
}
module.exports = { escapeMarkup };

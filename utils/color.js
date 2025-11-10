// utils/color.js
export const darkenColor = (col, amt) => {
    if (col.startsWith("#")) col = col.slice(1);
    let r = parseInt(col.slice(0, 2), 16) - amt;
    let g = parseInt(col.slice(2, 4), 16) - amt;
    let b = parseInt(col.slice(4, 6), 16) - amt;

    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));

    return (
        "#" +
        r.toString(16).padStart(2, "0") +
        g.toString(16).padStart(2, "0") +
        b.toString(16).padStart(2, "0")
    );
};

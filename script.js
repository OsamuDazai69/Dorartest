// Handle navigation between views
document.querySelectorAll(".card, .sub-list li").forEach((element) => {
    element.addEventListener("click", () => {
        const targetView = element.getAttribute("data-target");
        if (targetView) {
            showView(targetView);
        }
    });
});

// Handle back buttons
document.querySelectorAll(".back-btn").forEach((button) => {
    button.addEventListener("click", () => {
        const backView = button.getAttribute("data-back");
        if (backView) {
            showView(backView);
        }
    });
});

// Function to toggle views
function showView(viewId) {
    document.querySelectorAll(".view").forEach((view) => {
        view.classList.remove("active");
    });
    document.getElementById(viewId).classList.add("active");
}

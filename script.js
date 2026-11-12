
const medicineForm = document.getElementById("medicineForm");
const medicineList = document.getElementById("medicineList");
const searchMedicine = document.getElementById("searchMedicine");
const timingTimeFields = document.getElementById("timingTimeFields");

const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
const progressMessage = document.getElementById("progressMessage");

const totalMedicines = document.getElementById("totalMedicines");
const completedDoses = document.getElementById("completedDoses");
const totalStock = document.getElementById("totalStock");

const todayDate = document.getElementById("todayDate");
const notificationButton = document.getElementById("enableNotifications");

const defaultReminderTimes = {
    Morning: "08:00",
    Afternoon: "13:00",
    Night: "20:00"
};

let medicines = JSON.parse(localStorage.getItem("medicines_v2")) || [];
let completed = JSON.parse(localStorage.getItem("completed_v2")) || {};

const today = new Date().toDateString();
const savedDate = localStorage.getItem("savedDate_v2");

// Reset daily completion when the date changes
if (savedDate !== today) {
    completed = {};
    localStorage.setItem("completed_v2", JSON.stringify(completed));
    localStorage.setItem("savedDate_v2", today);
}

// Give older medicines default reminder times
medicines.forEach(medicine => {
    if (!medicine.reminderTimes) {
        medicine.reminderTimes = {};
    }

    medicine.doses.forEach(timing => {
        if (!medicine.reminderTimes[timing]) {
            medicine.reminderTimes[timing] = defaultReminderTimes[timing];
        }
    });
});

todayDate.textContent = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
});

// Save data
function saveData() {
    localStorage.setItem("medicines_v2", JSON.stringify(medicines));
    localStorage.setItem("completed_v2", JSON.stringify(completed));
    localStorage.setItem("savedDate_v2", today);
}

// Get selected timings from the form
function getSelectedTimings() {
    return Array.from(
        document.querySelectorAll('input[name="timing"]:checked')
    ).map(input => input.value);
}

// Show time inputs for selected timings
function renderTimingTimeInputs(existingTimes = {}) {
    timingTimeFields.innerHTML = "";

    const selectedTimings = getSelectedTimings();

    selectedTimings.forEach(timing => {
        const wrapper = document.createElement("div");
        wrapper.className = "timing-time-field";

        const label = document.createElement("label");
        label.textContent = timing + " Reminder Time";

        const input = document.createElement("input");
        input.type = "time";
        input.className = "reminder-time-input";
        input.dataset.timing = timing;
        input.required = true;

        input.value =
            existingTimes[timing] || defaultReminderTimes[timing];

        wrapper.append(label, input);
        timingTimeFields.appendChild(wrapper);
    });
}

// Update time fields whenever a timing checkbox changes
document.querySelectorAll('input[name="timing"]').forEach(checkbox => {
    checkbox.addEventListener("change", function() {
        renderTimingTimeInputs();
    });
});

// Add Medicine
medicineForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const name = document.getElementById("medicineName").value.trim();
    const dosage = document.getElementById("dosage").value.trim();
    const meal = document.getElementById("meal").value;
    const stock = Number(document.getElementById("stock").value);

    const selectedTimings = getSelectedTimings();

    if (selectedTimings.length === 0) {
        alert("Please select at least one timing.");
        return;
    }

    if (!name || !dosage || !Number.isInteger(stock) || stock < 1) {
        alert("Please enter valid medicine details.");
        return;
    }

    // Collect the reminder time for each selected dose
    const reminderTimes = {};

    selectedTimings.forEach(timing => {
        const timeInput = document.querySelector(
            '.reminder-time-input[data-timing="' + timing + '"]'
        );

        if (timeInput) {
            reminderTimes[timing] = timeInput.value;
        }
    });

    if (selectedTimings.some(timing => !reminderTimes[timing])) {
        alert("Please select a reminder time for every selected timing.");
        return;
    }

    medicines.push({
        id: Date.now().toString() + Math.random().toString(16).slice(2),
        name: name,
        dosage: dosage,
        meal: meal,
        stock: stock,
        doses: selectedTimings,
        reminderTimes: reminderTimes
    });

    saveData();
    medicineForm.reset();
    renderTimingTimeInputs();
    renderMedicines();
});

// Render Medicines
function renderMedicines() {
    medicineList.innerHTML = "";

    let totalDoses = 0;
    let takenCount = 0;
    let visibleMedicineCount = 0;

    // Calculate progress for all medicines
    medicines.forEach(medicine => {
        medicine.doses.forEach(timing => {
            totalDoses++;

            const doseKey = medicine.id + "_" + timing;

            if (completed[doseKey]) {
                takenCount++;
            }
        });
    });

    // Search medicines
    const searchTerm = searchMedicine.value.trim().toLowerCase();

    const filteredMedicines = medicines.filter(medicine =>
        medicine.name.toLowerCase().includes(searchTerm)
    );

    const timings = ["Morning", "Afternoon", "Night"];

    timings.forEach(timing => {
        const group = document.createElement("div");
        group.className = "timing-group";

        const heading = document.createElement("h3");
        heading.textContent = timing;
        group.appendChild(heading);

        let hasMedicine = false;

        filteredMedicines.forEach(medicine => {
            if (!medicine.doses.includes(timing)) return;

            hasMedicine = true;
            visibleMedicineCount++;

            const doseKey = medicine.id + "_" + timing;
            const isTaken = Boolean(completed[doseKey]);

            const item = document.createElement("div");
            item.className = "medicine-card";

            const info = document.createElement("div");
            info.className = "medicine-info";

            const title = document.createElement("strong");
            title.textContent = medicine.name;

            const details = document.createElement("p");
            details.textContent = medicine.dosage + " | " + medicine.meal;

            const reminderText = document.createElement("p");
            const reminderTime =
                medicine.reminderTimes?.[timing] ||
                defaultReminderTimes[timing];

            reminderText.textContent =
                "Reminder: " + formatTime(reminderTime);

            const stockText = document.createElement("p");
            stockText.textContent = "Stock: " + medicine.stock + " tablets";

            info.append(title, details, reminderText, stockText);

            // Low stock warning
            if (medicine.stock <= 5) {
                const warning = document.createElement("p");
                warning.className = "low-stock";

                warning.textContent = medicine.stock === 0
                    ? "Out of stock!"
                    : "Low stock! Refill soon.";

                info.appendChild(warning);
            }

            // Dose checkbox
            const checkLabel = document.createElement("label");
            checkLabel.className = "dose-action";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "dose-checkbox";
            checkbox.checked = isTaken;
            checkbox.disabled = isTaken || medicine.stock <= 0;

            const labelText = document.createTextNode(
                isTaken ? "Taken" :
                medicine.stock <= 0 ? "Out of Stock" : "Mark Taken"
            );

            checkLabel.append(checkbox, labelText);

            checkbox.addEventListener("change", function() {
                if (!checkbox.checked || medicine.stock <= 0) return;

                completed[doseKey] = true;
                medicine.stock--;

                saveData();
                renderMedicines();
            });

            // Medicine action buttons
            const actions = document.createElement("div");
            actions.className = "medicine-actions";

            // Edit button
            const editButton = document.createElement("button");
            editButton.textContent = "Edit";
            editButton.className = "edit-btn";

            editButton.addEventListener("click", function() {
                const newName = prompt("Enter medicine name:", medicine.name);
                if (newName === null) return;

                const newDosage = prompt("Enter dosage:", medicine.dosage);
                if (newDosage === null) return;

                const newStock = prompt("Enter available tablets:", medicine.stock);
                if (newStock === null) return;

                const stockNumber = Number(newStock);

                const newMeal = prompt(
                    "Enter meal instruction (Before Food / After Food):",
                    medicine.meal
                );
                if (newMeal === null) return;

                const newTimings = prompt(
                    "Enter timings separated by commas (Morning, Afternoon, Night):",
                    medicine.doses.join(", ")
                );
                if (newTimings === null) return;

                const validTimings = ["Morning", "Afternoon", "Night"];

                const timingArray = [
                    ...new Set(
                        newTimings
                            .split(",")
                            .map(value => value.trim())
                            .filter(value => validTimings.includes(value))
                    )
                ];

                if (
                    !newName.trim() ||
                    !newDosage.trim() ||
                    !Number.isInteger(stockNumber) ||
                    stockNumber < 0 ||
                    !["Before Food", "After Food"].includes(newMeal) ||
                    timingArray.length === 0
                ) {
                    alert("Invalid details. Please try again.");
                    return;
                }

                // Ask for a separate reminder time for every selected dose
                const newReminderTimes = {};

                for (const doseTiming of timingArray) {
                    const oldTime =
                        medicine.reminderTimes?.[doseTiming] ||
                        defaultReminderTimes[doseTiming];

                    const newTime = prompt(
                        "Enter reminder time for " + doseTiming +
                        " (24-hour format, e.g. 08:30):",
                        oldTime
                    );

                    if (newTime === null) return;

                    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(newTime)) {
                        alert("Invalid time. Please use HH:MM format, e.g. 08:30.");
                        return;
                    }

                    newReminderTimes[doseTiming] = newTime;
                }

                // Clear old completion records
                Object.keys(completed).forEach(key => {
                    if (key.startsWith(medicine.id + "_")) {
                        delete completed[key];
                    }
                });

                medicine.name = newName.trim();
                medicine.dosage = newDosage.trim();
                medicine.stock = stockNumber;
                medicine.meal = newMeal;
                medicine.doses = timingArray;
                medicine.reminderTimes = newReminderTimes;

                saveData();
                renderMedicines();
            });

            // Delete button
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";
            deleteButton.className = "delete-btn";

            deleteButton.addEventListener("click", function() {
                const confirmDelete = confirm(
                    "Are you sure you want to delete " + medicine.name + "?"
                );

                if (!confirmDelete) return;

                medicines = medicines.filter(
                    existingMedicine => existingMedicine.id !== medicine.id
                );

                Object.keys(completed).forEach(key => {
                    if (key.startsWith(medicine.id + "_")) {
                        delete completed[key];
                    }
                });

                saveData();
                renderMedicines();
            });

            // Refill stock button
            const refillButton = document.createElement("button");
            refillButton.textContent = "Refill Stock";
            refillButton.className = "refill-btn";

            refillButton.addEventListener("click", function() {
                const refillAmount = prompt(
                    "How many tablets do you want to add?"
                );

                if (refillAmount === null) return;

                const tablets = Number(refillAmount);

                if (!Number.isInteger(tablets) || tablets <= 0) {
                    alert("Please enter a valid positive number.");
                    return;
                }

                medicine.stock += tablets;

                saveData();
                renderMedicines();

                alert("Stock refilled successfully!");
            });

            actions.append(editButton, refillButton, deleteButton);

            item.append(info, checkLabel, actions);
            group.appendChild(item);
        });

        if (hasMedicine) {
            medicineList.appendChild(group);
        }
    });

    // Empty schedule message
    if (visibleMedicineCount === 0) {
        medicineList.textContent = searchTerm
            ? "No matching medicines found."
            : "No medicines added yet.";
    }

    // Progress calculation
    const percentage = totalDoses === 0
        ? 0
        : Math.round((takenCount / totalDoses) * 100);

    totalMedicines.textContent = medicines.length;
    completedDoses.textContent = takenCount;

    const remainingTablets = medicines.reduce(
        (sum, medicine) => sum + medicine.stock, 0
    );

    totalStock.textContent = remainingTablets;

    progressText.textContent =
        takenCount + " / " + totalDoses +
        " doses completed (" + percentage + "%)";

    progressFill.style.width = percentage + "%";

    if (percentage === 100 && totalDoses > 0) {
        progressMessage.textContent = "🎉 Great job! All doses completed!";
    } else {
        progressMessage.textContent = "Let's complete today's schedule!";
    }
}

// Convert 24-hour time into 12-hour display
function formatTime(time) {
    if (!time) return "";

    const [hours, minutes] = time.split(":").map(Number);

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    return date.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
}

// Search event
searchMedicine.addEventListener("input", function() {
    renderMedicines();
});

// Initial render
renderTimingTimeInputs();
renderMedicines();


// ------------------------------------
// MEDICINE REMINDER NOTIFICATIONS
// ------------------------------------

// Update notification button status
function updateNotificationButton() {
    if (!("Notification" in window)) {
        notificationButton.textContent = "Notifications Not Supported";
        notificationButton.disabled = true;
        return;
    }

    if (Notification.permission === "granted") {
        notificationButton.textContent = "Notifications Enabled ✓";
    } else if (Notification.permission === "denied") {
        notificationButton.textContent = "Notifications Blocked";
    } else {
        notificationButton.textContent = "Enable Medicine Notifications";
    }
}

// Ask notification permission
notificationButton.addEventListener("click", async function() {
    if (!("Notification" in window)) {
        alert("Your browser does not support notifications.");
        return;
    }

    const permission = await Notification.requestPermission();

    updateNotificationButton();

    if (permission === "granted") {
        alert("Medicine notifications enabled successfully!");
        checkMedicineReminders();
    } else {
        alert("Please allow notifications in your browser settings.");
    }
});

// Get today's date for reminder tracking
function getReminderDate() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;
}

// Check and send medicine reminders
function checkMedicineReminders() {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    medicines.forEach(medicine => {
        medicine.doses.forEach(timing => {
            const reminderTime =
                medicine.reminderTimes?.[timing] ||
                defaultReminderTimes[timing];

            if (!reminderTime || medicine.stock <= 0) return;

            const [hours, minutes] = reminderTime.split(":").map(Number);
            const scheduledMinutes = hours * 60 + minutes;

            const difference = currentMinutes - scheduledMinutes;

            // Reminder is sent within 10 minutes of its scheduled time
            if (difference < 0 || difference > 10) return;

            const doseKey = medicine.id + "_" + timing;

            // Do not remind if already taken
            if (completed[doseKey]) return;

            // Unique key for this medicine, dose, date and reminder time
            const reminderKey =
                "reminderSent_" +
                getReminderDate() + "_" +
                medicine.id + "_" +
                timing + "_" +
                reminderTime;

            // Prevent duplicate notifications
            if (localStorage.getItem(reminderKey)) return;

            const notification = new Notification(
                "Time to take your medicine 💊",
                {
                    body:
                        medicine.name + " - " +
                        medicine.dosage + "\n" +
                        medicine.meal + " | " +
                        timing + " | " +
                        formatTime(reminderTime),
                    tag: reminderKey
                }
            );

            localStorage.setItem(reminderKey, "sent");

            notification.onclick = function() {
                window.focus();
                notification.close();
            };
        });
    });
}

// Start notification system
updateNotificationButton();

setInterval(checkMedicineReminders, 15000);
checkMedicineReminders();

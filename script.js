// Cache DOM elements để tránh query nhiều lần
const DOM = {
    current: null,
    goal: null,
    goalSelect: null,
    fill: null,
    history: null
};

// Khởi tạo cache khi DOM đã sẵn sàng
function initDOM() {
    DOM.current = document.getElementById("current");
    DOM.goal = document.getElementById("goal");
    DOM.goalSelect = document.getElementById("goalSelect");
    DOM.fill = document.getElementById("fill");
    DOM.history = document.getElementById("history");
}

const today = new Date().toLocaleDateString();
let data = JSON.parse(localStorage.getItem("waterPro")) || {};

if (!data[today]) data[today] = { amount: 0, goal: 2000 };
let amount = data[today].amount;
let goal = data[today].goal;

// Debounce function để tránh lưu quá nhiều lần
let saveTimeout;
function save() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        localStorage.setItem("waterPro", JSON.stringify(data));
    }, 100);
}

function updateUI() {
    DOM.current.textContent = amount;
    DOM.goal.textContent = goal;
    DOM.goalSelect.value = goal;

    const percent = Math.min(amount / goal * 100, 100);
    DOM.fill.style.height = percent + "%";
}

function add(ml) {
    amount += ml;
    data[today].amount = amount;
    save();
    updateUI();
    showNotification('💧 Đã ghi nhận!', `Bạn vừa uống ${ml}ml. Tổng hôm nay: ${amount}ml`);
    loadHistory();
    updateMonthlyStats();
    renderChart();
}

function customDrink() {
    showCustomPopup();
}

function showCustomPopup() {
    const popup = document.getElementById('customPopup');
    const input = document.getElementById('customAmount');
    popup.classList.add('active');
    input.value = '';
    setTimeout(() => input.focus(), 100);
}

function hideCustomPopup() {
    const popup = document.getElementById('customPopup');
    popup.classList.remove('active');
}

function setCustomAmount(amount) {
    document.getElementById('customAmount').value = amount;
}

function confirmCustomAmount() {
    const input = document.getElementById('customAmount');
    const ml = parseInt(input.value);
    if (ml && ml > 0 && ml <= 5000) {
        hideCustomPopup();
        add(ml);
    } else {
        input.classList.add('error');
        setTimeout(() => input.classList.remove('error'), 500);
    }
}

function changeGoal() {
    goal = parseInt(DOM.goalSelect.value);
    data[today].goal = goal;
    save();
    updateUI();
}

// Tối ưu rendering history với DocumentFragment
function loadHistory() {
    const fragment = document.createDocumentFragment();
    const dates = Object.keys(data).reverse();

    dates.forEach(date => {
        const item = document.createElement("div");
        item.className = "history-item";

        const dateLabel = document.createElement("b");
        dateLabel.textContent = date;

        item.appendChild(dateLabel);
        item.appendChild(document.createTextNode(`: ${data[date].amount} / ${data[date].goal} ml`));

        fragment.appendChild(item);
    });

    DOM.history.innerHTML = "";
    DOM.history.appendChild(fragment);
}

// Khởi tạo khi DOM đã sẵn sàng
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

function init() {
    initDOM();
    initTheme();
    updateUI();
    loadHistory();
    updateMonthlyStats();
    renderChart();
    requestNotificationPermission();
    initReminder();

    // Hide splash screen after 2.5 seconds
    setTimeout(() => {
        const splash = document.getElementById('splash');
        if (splash) {
            splash.style.display = 'none';
        }
    }, 2500);
}

// ===== NOTIFICATION SYSTEM =====
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        // Request permission after a short delay to not interrupt splash screen
        setTimeout(() => {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    showNotification('🎉 Thông báo đã bật!', 'Bạn sẽ nhận được nhắc nhở uống nước định kỳ.');
                }
            });
        }, 3000);
    }
}

function showNotification(title, body, icon = '💧') {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
            body: body,
            icon: 'icon.svg',
            badge: 'icon.svg',
            tag: 'water-reminder',
            requireInteraction: false,
            silent: false
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        // Auto close after 5 seconds
        setTimeout(() => notification.close(), 5000);
    } else if ('Notification' in window && Notification.permission === 'default') {
        // If permission not yet requested, ask now
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showNotification(title, body, icon);
            }
        });
    } else {
        // Fallback to alert if notifications not supported
        console.log(title + ': ' + body);
    }
}

// ===== THEME TOGGLE =====
function initTheme() {
    // Load saved theme or use system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.body.setAttribute('data-theme', savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.setAttribute('data-theme', 'dark');
    } else {
        document.body.setAttribute('data-theme', 'light');
    }
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // Re-render chart with new colors
    renderChart();
}

// ===== MONTHLY STATISTICS =====
function getMonthlyData() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyData = [];
    let totalAmount = 0;
    let daysWithGoal = 0;

    Object.keys(data).forEach(dateStr => {
        const date = new Date(dateStr);
        if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
            const dayData = data[dateStr];
            monthlyData.push({
                date: date.getDate(),
                amount: dayData.amount,
                goal: dayData.goal
            });
            totalAmount += dayData.amount;
            if (dayData.amount >= dayData.goal) {
                daysWithGoal++;
            }
        }
    });

    // Sort by date
    monthlyData.sort((a, b) => a.date - b.date);

    return {
        data: monthlyData,
        total: totalAmount,
        average: monthlyData.length > 0 ? Math.round(totalAmount / monthlyData.length) : 0,
        goalPercentage: monthlyData.length > 0 ? Math.round((daysWithGoal / monthlyData.length) * 100) : 0
    };
}

function updateMonthlyStats() {
    const stats = getMonthlyData();

    if (DOM.monthTotal) {
        DOM.monthTotal = document.getElementById('monthTotal');
        DOM.monthAvg = document.getElementById('monthAvg');
        DOM.monthGoal = document.getElementById('monthGoal');
    }

    if (DOM.monthTotal) {
        DOM.monthTotal.textContent = (stats.total / 1000).toFixed(1) + 'L';
        DOM.monthAvg.textContent = stats.average + 'ml';
        DOM.monthGoal.textContent = stats.goalPercentage + '%';
    }
}

function renderChart() {
    const canvas = document.getElementById('statsChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const stats = getMonthlyData();
    const monthData = stats.data;

    if (monthData.length === 0) {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw empty state illustration
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Draw water droplet icon
        ctx.fillStyle = 'rgba(63, 164, 255, 0.2)';
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - 40);
        ctx.quadraticCurveTo(centerX - 30, centerY - 10, centerX - 30, centerY + 10);
        ctx.quadraticCurveTo(centerX - 30, centerY + 35, centerX, centerY + 35);
        ctx.quadraticCurveTo(centerX + 30, centerY + 35, centerX + 30, centerY + 10);
        ctx.quadraticCurveTo(centerX + 30, centerY - 10, centerX, centerY - 40);
        ctx.fill();

        // Draw text
        ctx.fillStyle = '#999';
        ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Chưa có dữ liệu tháng này', centerX, centerY + 60);

        ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = '#bbb';
        ctx.fillText('Hãy bắt đầu uống nước ngay hôm nay! 💧', centerX, centerY + 85);
        return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;

    // Find max value for scaling
    const maxValue = Math.max(...monthData.map(d => Math.max(d.amount, d.goal)));
    const scale = chartHeight / maxValue;

    const barWidth = Math.min(chartWidth / monthData.length - 5, 30);
    const gap = 5;

    // Draw bars
    monthData.forEach((day, index) => {
        const x = padding + index * (barWidth + gap);

        // Goal bar (lighter)
        const goalHeight = day.goal * scale;
        ctx.fillStyle = 'rgba(63, 164, 255, 0.2)';
        ctx.fillRect(x, padding + chartHeight - goalHeight, barWidth, goalHeight);

        // Actual bar (solid)
        const actualHeight = day.amount * scale;
        const barColor = day.amount >= day.goal ? '#3fa4ff' : '#ff9f43';
        ctx.fillStyle = barColor;
        ctx.fillRect(x, padding + chartHeight - actualHeight, barWidth, actualHeight);

        // Date label
        if (index % Math.ceil(monthData.length / 10) === 0) {
            ctx.fillStyle = '#666';
            ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(day.date, x + barWidth / 2, canvas.height - 10);
        }
    });

    // Draw Y-axis labels
    ctx.fillStyle = '#666';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 4; i++) {
        const value = Math.round((maxValue / 4) * i);
        const y = padding + chartHeight - (value * scale);
        ctx.fillText(value + 'ml', padding - 10, y + 4);

        // Grid line
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();
    }
}

// ===== SMART REMINDER SYSTEM =====
let reminderIntervalId = null;
let reminderInterval = parseInt(localStorage.getItem('reminderInterval')) || 3600000; // Default 1 hour

function sendWaterReminder() {
    const percent = Math.min(amount / goal * 100, 100);
    const remaining = Math.max(goal - amount, 0);
    const currentHour = new Date().getHours();

    let title = '💧 Đến giờ uống nước rồi!';
    let body = '';

    // Time-based suggestions
    if (currentHour >= 6 && currentHour < 8) {
        title = '🌅 Chào buổi sáng!';
        body = 'Uống 1 ly nước ấm để bắt đầu ngày mới tràn đầy năng lượng.';
    } else if (currentHour >= 8 && currentHour < 11) {
        title = '☕ Giờ làm việc!';
        body = 'Đừng quên uống nước sau bữa sáng nhé.';
    } else if (currentHour >= 11 && currentHour < 13) {
        title = '🍽️ Trước bữa trưa!';
        body = 'Uống nước trước khi ăn giúp kiểm soát khẩu phần tốt hơn.';
    } else if (currentHour >= 13 && currentHour < 15) {
        title = '😴 Sau giấc ngủ trưa!';
        body = 'Uống nước để tỉnh táo cho buổi chiều làm việc.';
    } else if (currentHour >= 15 && currentHour < 17) {
        title = '💼 Giữa buổi chiều!';
        body = 'Uống nước giúp bạn tập trung hơn.';
    } else if (currentHour >= 17 && currentHour < 19) {
        title = '🏃 Sau vận động!';
        body = 'Bổ sung nước sau hoạt động thể chất.';
    } else if (currentHour >= 19 && currentHour < 21) {
        title = '🌆 Buổi tối!';
        body = 'Uống nước thanh lọc cơ thể sau ngày dài.';
    } else if (currentHour >= 21 && currentHour < 23) {
        title = '🌙 Trước khi ngủ!';
        body = 'Uống 1 ly nước nhỏ trước khi đi ngủ 30 phút.';
    } else {
        // Progress-based messages for other times
        if (percent >= 100) {
            title = '🎉 Tuyệt vời!';
            body = 'Bạn đã đạt mục tiêu hôm nay! Hãy tiếp tục duy trì nhé.';
        } else if (percent >= 75) {
            body = `Sắp đạt mục tiêu rồi! Còn ${remaining}ml nữa thôi.`;
        } else if (percent >= 50) {
            body = `Bạn đã uống ${amount}ml. Còn ${remaining}ml để đạt mục tiêu.`;
        } else if (percent >= 25) {
            body = `Hãy uống thêm nước nhé! Bạn mới đạt ${Math.round(percent)}% mục tiêu.`;
        } else {
            body = `Đừng quên uống nước! Mục tiêu hôm nay: ${goal}ml.`;
        }
    }

    showNotification(title, body);
}

function startReminder() {
    // Clear existing interval
    if (reminderIntervalId) {
        clearInterval(reminderIntervalId);
        reminderIntervalId = null;
    }

    // Start new interval if not disabled
    if (reminderInterval > 0) {
        reminderIntervalId = setInterval(() => {
            sendWaterReminder();
        }, reminderInterval);
    }
}

function changeReminderInterval() {
    const select = document.getElementById('reminderInterval');
    reminderInterval = parseInt(select.value);
    localStorage.setItem('reminderInterval', reminderInterval);
    startReminder();

    if (reminderInterval === 0) {
        showNotification('🔕 Đã tắt nhắc nhở', 'Bạn sẽ không nhận thông báo tự động nữa.');
    } else {
        const minutes = reminderInterval / 60000;
        showNotification('🔔 Đã cập nhật!', `Bạn sẽ nhận nhắc nhở mỗi ${minutes >= 60 ? (minutes / 60) + ' giờ' : minutes + ' phút'}.`);
    }
}

// Initialize reminder interval selector
function initReminder() {
    const select = document.getElementById('reminderInterval');
    if (select) {
        select.value = reminderInterval;
    }
    startReminder();
}

// For testing: uncomment to get reminder every 10 seconds
// reminderInterval = 10000;
// localStorage.setItem('reminderInterval', 10000);
// startReminder();

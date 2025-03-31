const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

// ✅ Menu Structure with Prices
const menu = {
    breakfast: {
        beverages: { "☕ Coffee": 35, "🍵 Tea": 20, "🥛 Milkshake": 50 },
        food: { "🍽 Idli": 35, "🥞 Dosa": 50, "🍩 Medu Wada": 40, "🍚 Poha": 35 }
    },
    lunch: {
        beverages: { "🥤 Cold Drink": 30, "🥛 Lassi": 35, "🍹 Mojito": 50, "🥤 Soda": 20 },
        food: { "🍞 Pav Bhaji": 90, "🍛 Thali": 110, "🥟 Samosa": 25, "🍴 Cutlet": 25, "🍜 Noodles": 70, "🍚 Fried Rice": 80, "🍝 Pasta": 80, "🍟 French Fries": 90 }
    }
};

// ✅ Chatbot State
let currentStep = "greeting";
let totalBill = 0;
let lastUnavailableMenu = "";
let currentMenuType = "";
let selectedItem = "";
let orderId = ""; // ✅ Order ID variable

// ✅ Function to update IST clock
function updateClock() {
    let time = new Date().toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour12: true });
    document.getElementById("clock").innerText = time;
}
setInterval(updateClock, 1000);
updateClock();

// ✅ Function to add messages to chat
function addMessage(message, sender) {
    let messageElement = document.createElement("div");
    messageElement.classList.add(sender === "bot" ? "bot-message" : "user-message");
    messageElement.innerHTML = message;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ✅ Welcome Message
setTimeout(() => addMessage("Welcome to the Canteen Buddy chatbot! 😊", "bot"), 1000);

// ✅ Function to generate Order ID
function generateOrderId() {
    return "ORD" + Math.floor(1000 + Math.random() * 9000);
}

// ✅ Handle User Input
sendBtn.addEventListener("click", function () {
    let userText = userInput.value.trim().toLowerCase();
    if (userText === "") return;

    addMessage(userText, "user");
    userInput.value = "";

    let hours = new Date().toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour12: false }).split(":")[0];

    if (currentStep === "greeting") {
        if (userText === "hello" || userText === "hi") {
            addMessage("What would you like to have today? 🍽", "bot");
            addMessage("Please type 'breakfast' or 'lunch'.", "bot");
            currentStep = "menu_selection";
        } else {
            addMessage("Please start by saying 'hi' or 'hello'.", "bot");
        }
        return;
    }

    if (currentStep === "menu_selection") {
        if (userText === "breakfast") {
            if (hours >= 9 && hours < 12) {
                currentMenuType = "breakfast";
                addMessage("Great! Here's the Breakfast Menu 🍳", "bot");
                addMessage("Would you like 'beverages' or 'food'?", "bot");
                currentStep = "submenu_selection";
            } else {
                lastUnavailableMenu = "breakfast";
                addMessage("Breakfast is currently unavailable. Would you like to explore lunch instead? (yes/no)", "bot");
                currentStep = "alternative_menu";
            }
        } else if (userText === "lunch") {
            if (hours >= 12 && hours < 17) {
                currentMenuType = "lunch";
                addMessage("Great! Here's the Lunch Menu 🍽", "bot");
                addMessage("Would you like 'beverages' or 'food'?", "bot");
                currentStep = "submenu_selection";
            } else {
                lastUnavailableMenu = "lunch";
                addMessage("Lunch is currently unavailable. Would you like to explore breakfast instead? (yes/no)", "bot");
                currentStep = "alternative_menu";
            }
        } else {
            addMessage("Please type 'breakfast' or 'lunch'.", "bot");
        }
        return;
    }

    if (currentStep === "alternative_menu") {
        if (userText === "yes") {
            currentMenuType = lastUnavailableMenu === "breakfast" ? "lunch" : "breakfast";
            addMessage(`Great! Here's the ${currentMenuType} menu.`, "bot");
            addMessage("Would you like 'beverages' or 'food'?", "bot");
            currentStep = "submenu_selection";
        } else {
            addMessage("Okay, no problem. Have a great day! 😊", "bot");
            currentStep = "greeting";
        }
        return;
    }

    if (currentStep === "submenu_selection") {
        if (userText === "beverages") {
            let beverageMenu = Object.entries(menu[currentMenuType].beverages)
                .map(([item, price]) => `${item} - ₹${price}`)
                .join("<br>");
            addMessage(`Here are the beverages: <br>${beverageMenu}`, "bot");
            addMessage("Please type the name of the item you'd like to order.", "bot");
            currentStep = "ordering";
        } else if (userText === "food") {
            let foodMenu = Object.entries(menu[currentMenuType].food)
                .map(([item, price]) => `${item} - ₹${price}`)
                .join("<br>");
            addMessage(`Here are the food items: <br>${foodMenu}`, "bot");
            addMessage("Please type the name of the item you'd like to order.", "bot");
            currentStep = "ordering";
        } else {
            addMessage("Please type 'beverages' or 'food'.", "bot");
        }
        return;
    }

    if (currentStep === "ordering") {
        let foundItem = Object.entries({ ...menu[currentMenuType].beverages, ...menu[currentMenuType].food })
            .find(([key]) => key.toLowerCase().includes(userText));

        if (foundItem) {
            selectedItem = foundItem;
            addMessage(`How many ${selectedItem[0]} would you like to order?`, "bot");
            currentStep = "quantity_selection";
        } else {
            addMessage("Item not available. Please choose from the menu.", "bot");
        }
        return;
    }

    if (currentStep === "quantity_selection") {
        let quantity = parseInt(userText);
        if (!isNaN(quantity) && quantity > 0) {
            let cost = selectedItem[1] * quantity;
            totalBill += cost;
            addMessage(`Added ${quantity}x ${selectedItem[0]} to your order. ✅ (₹${cost})`, "bot");
            addMessage("Would you like to add more items? (yes/no)", "bot");
            currentStep = "add_more";
        } else {
            addMessage("Please enter a valid quantity (e.g., 2, 3, 5).", "bot");
        }
        return;
    }

if (currentStep === "add_more") {
    if (userText.toLowerCase() === "yes") {
        addMessage("Would you like 'beverages' or 'food'?", "bot");
        currentStep = "submenu_selection";
    } else {
        addMessage(`Your total bill is **₹${totalBill}**. How would you like to pay? (cash/online)`, "bot");
        currentStep = "payment";  
    }
    return;
}

if (currentStep === "payment") {  
    if (userText.toLowerCase() === "online") {
        let qrCodeUrl = "https://i.postimg.cc/YS0kRQPC/QR.jpg"; 
        addMessage(`Scan this QR code to complete your payment:<br><img src="${qrCodeUrl}" width="200">`, "bot");
        addMessage("💰 Please confirm once you have completed the payment. (Type 'done')", "bot");
        currentStep = "payment_confirmation";  
    } else if (userText.toLowerCase() === "cash") {
        processPayment("cash");
    } else {
        addMessage("❌ Invalid option. Please choose 'cash' or 'online'.", "bot");
    }
    return;
}

if (currentStep === "payment_confirmation" && userText.toLowerCase() === "done") {
    processPayment("online");  
}

function processPayment(method) {
    let orderID = generateOrderId();  
    addMessage(`✅ Payment received via ${method}.`, "bot");
    addMessage(`📌 Your Order ID is: **${orderID}**.`, "bot");
    addMessage("🎉 Please show this Order ID at the counter to collect your meal. 🍽", "bot");
    addMessage("Thank you for ordering! Have a great day! 😊", "bot");

    currentStep = "greeting";  
    totalBill = 0;
}

});
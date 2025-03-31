// ✅ Generate a purely numeric session ID (6-digit random number)
function generateSessionId() {
    return Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit number
}

// ✅ Retrieve or create session ID
const sessionId = generateSessionId();
localStorage.setItem("session_id", sessionId);
console.log("Session ID:", sessionId);

const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

currentStep = "greeting";
totalBill = 0;
let selectedItem = "";
let menuItems = [];
let orderItems = [];

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

async function fetchMenu(type) {
    const response = await fetch('http://127.0.0.1:5000/menu');
    const menuData = await response.json();

    console.log("Fetched Menu:", menuData); 

    // Flatten the nested arrays
    let flattenedMenu = menuData.flat();
    console.log("Flattened Menu:", flattenedMenu);

    // Convert the flat array into an array of objects
    menuItems = [];
    for (let i = 0; i < flattenedMenu.length; i += 4) {
        menuItems.push({
            id: flattenedMenu[i],
            item_name: flattenedMenu[i + 1],
            category: flattenedMenu[i + 2],
            price: flattenedMenu[i + 3]
        });
    }

    console.log("Structured Menu:", menuItems);

    // Now filter based on category
    let filteredMenu = menuItems.filter(item => item.category.toLowerCase() === type);
    console.log("Filtered Menu:", filteredMenu);
    
    return filteredMenu;
}




// Send session ID to Flask API for initialization
async function clearSession() {
    const sessionId = localStorage.getItem("session_id");
    await fetch('http://127.0.0.1:5000/clear-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
    });
}



async function startNewOrder() {
    await clearSession();
    addMessage("New order started! What would you like to have?", "bot");
}

let currentOrderId = null;  // ✅ Store order ID globally

async function placeOrder(items) {
    if (!Array.isArray(items) || items.length === 0) {
        console.error("❌ Invalid order format or empty order:", items);
        return { message: "❌ Order is empty.", order_id: null };
    }

    const orderData = {
        session_id: sessionId,
        order_items: items.map(item => ({ item_id: item.id, quantity: item.quantity }))
    };

    console.log("📤 Sending Order Data:", orderData);

    try {
        const response = await fetch('http://127.0.0.1:5000/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        const data = await response.json();
        console.log("📥 Received Response:", data);

        if (data.order_id) {
            currentOrderId = data.order_id;
        }
        return data;
    } catch (error) {
        console.error("❌ Error placing order:", error);
        addMessage("❌ Could not place the order due to a server error. Please try again.", "bot");
    }
}




async function fetchBill() {
    try {
        if (!currentOrderId) {
            addMessage("❌ No active order found.", "bot");
            return;
        }

        const response = await fetch(`http://127.0.0.1:5000/bill?order_id=${currentOrderId}`);
        let bill = await response.json();

        console.log("✅ Debug: Raw bill response:", bill);  // 🛠️ Debugging

        if (!bill || !bill.orders) {
            addMessage("❌ Bill retrieval failed. No orders found.", "bot");
            return;
        }

        return bill;
    } catch (error) {
        console.error("❌ Error fetching bill:", error);
    }
}



async function processPayment(paymentMethod, orderId) {
    const paymentData = {
        order_id: orderId,  // Ensure orderId is passed
        payment_method: paymentMethod,
    };

    try {
        const response = await fetch('http://127.0.0.1:5000/make_payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentData),
        });

        const data = await response.json();
        if (response.ok) {
            console.log('Payment successful:', data);
            return data;
        } else {
            console.error('Payment failed:', data.error);
            return null;
        }
    } catch (error) {
        console.error('Error during payment:', error);
    }
}


document.getElementById("user-input").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault(); // Prevents a new line if it's a textarea
        document.getElementById("send-btn").click(); // Triggers the send button
    }
});



sendBtn.addEventListener("click", async function () {
    let userText = userInput.value.trim().toLowerCase();
    if (userText === "") return;

    addMessage(userText, "user");
    userInput.value = "";

    let hours = new Date().toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour12: false }).split(":")[0];

    if (currentStep === "greeting") {
        if (userText === "hello" || userText === "hi") {
            addMessage("What would you like to have today? 🍽", "bot");
            addMessage("Please type 'Breakfast', 'Lunch', or 'Beverage'.", "bot");
            currentStep = "menu_selection";
        } else {
            addMessage("Please start by saying 'hi' or 'hello'.", "bot");
        }
        return;
    }

    if (currentStep === "menu_selection") {
        let hours = new Date().getHours();
    
        if (userText.toLowerCase() === "breakfast") {
            if (hours >= 9 && hours < 12) {
                // Fetch Breakfast menu
                menuItems = await fetchMenu("breakfast");
                if (menuItems.length > 0) {
                    let menuText = menuItems.map(item => `${item.item_name} - ₹${item.price}`).join("<br>");
                    addMessage(`Here's the Breakfast Menu 🍳:<br>${menuText}`, "bot");
                    addMessage("Please type the name of the breakfast item you'd like to order.", "bot");
                    currentStep = "ordering";
                } else {
                    addMessage("Sorry, no breakfast items are available at the moment.", "bot");
                }
            } else {
                // Breakfast unavailable, offer lunch
                lastUnavailableMenu = "breakfast";
                addMessage("Breakfast is currently unavailable. Would you like to explore lunch instead? (yes/no)", "bot");
                currentStep = "alternative_menu";
            }
        } else if (userText.toLowerCase() === "lunch") {
            if (hours >= 12 && hours < 17) {
                // Fetch Lunch menu
                menuItems = await fetchMenu("lunch");
                if (menuItems.length > 0) {
                    let menuText = menuItems.map(item => `${item.item_name} - ₹${item.price}`).join("<br>");
                    addMessage(`Here's the Lunch Menu 🍽:<br>${menuText}`, "bot");
                    addMessage("Please type the name of the lunch item you'd like to order.", "bot");
                    currentStep = "ordering";
                } else {
                    addMessage("Sorry, no lunch items are available at the moment.", "bot");
                }
            } else {
                // Lunch unavailable, offer breakfast
                lastUnavailableMenu = "lunch";
                addMessage("Lunch is currently unavailable. Would you like to explore breakfast instead? (yes/no)", "bot");
                currentStep = "alternative_menu";
            }
        } else if (userText.toLowerCase() === "beverage") {
            // No time constraint for beverages
            menuItems = await fetchMenu("beverage");
            if (menuItems.length > 0) {
                let menuText = menuItems.map(item => `${item.item_name} - ₹${item.price}`).join("<br>");
                addMessage(`Here's the Beverages Menu 🍹:<br>${menuText}`, "bot");
                addMessage("Please type the name of the beverage you'd like to order.", "bot");
                currentStep = "ordering";
            } else {
                addMessage("Sorry, no beverages are available at the moment.", "bot");
            }
        } else {
            addMessage("Please type 'Breakfast', 'Lunch', or 'Beverage'.", "bot");
        }
        return;
    }
    
    // Alternative Menu Selection
    if (currentStep === "alternative_menu") {
        if (userText.toLowerCase() === "yes") {
            // Determine which menu to show
            currentMenuType = lastUnavailableMenu === "breakfast" ? "lunch" : "breakfast";
            menuItems = await fetchMenu(currentMenuType);
    
            if (menuItems.length > 0) {
                let menuText = menuItems.map(item => `${item.item_name} - ₹${item.price}`).join("<br>");
                addMessage(`Great! Here's the ${currentMenuType} menu:<br>${menuText}`, "bot");
                addMessage("Please type the name of the item you'd like to order.", "bot");
                currentStep = "ordering";
            } else {
                addMessage(`Sorry, no ${currentMenuType} items are available either.`, "bot");
                currentStep = "menu_selection";  // Allow retry or fallback
            }
        } else if (userText.toLowerCase() === "no") {
            addMessage("Okay, no problem. Have a great day! 😊", "bot");
            currentStep = "greeting";  // Transition back to greeting step or initial state
        } else {
            addMessage("Please reply with 'yes' to explore the alternative menu or 'no' to cancel.", "bot");
        }
        return;
    }
    
    
    

    if (currentStep === "ordering") {
        selectedItem = menuItems.find(item => item.item_name.toLowerCase() === userText);
        if (selectedItem) {
            addMessage(`How many ${selectedItem.item_name} would you like to order?`, "bot");
            currentStep = "quantity_selection";
        } else {
            addMessage("❌ This item is not on the menu. Please select a valid item.", "bot");
        }
        return;
    }

    if (currentStep === "quantity_selection") {
        let quantity = parseInt(userText);
        if (!isNaN(quantity) && quantity > 0) {
            console.log("✅ Adding item to order:", selectedItem, "Quantity:", quantity);
            orderItems.push({ id: selectedItem.id, quantity: quantity });
            console.log("✅ Updated orderItems:", orderItems);  // Debug order storage
            addMessage(`Added ${quantity}x ${selectedItem.item_name} to your order.`, "bot");
            addMessage("Would you like to add more items? (yes/no)", "bot");
            currentStep = "add_more";
        } else {
            addMessage("Please enter a valid quantity.", "bot");
        }
        return;
    }
    
    if (currentStep === "add_more") {
        if (userText === "no") {
            console.log("✅ Debug: Final order items before placing order:", orderItems);
    
            if (orderItems.length === 0) {  // ✅ Check if orderItems is empty
                addMessage("❌ No items in the order. Please add items first.", "bot");
                return;
            }
    
            let orderResponse = await placeOrder(orderItems);
            console.log("✅ Debug: Order Response from API:", orderResponse);
    
            if (!orderResponse || !orderResponse.order_id) {
                addMessage("❌ Order placement failed. Try again.", "bot");
                return;
            }
    
            addMessage(orderResponse.message, "bot");
    
            let bill = await fetchBill();
            console.log("✅ Debug: Fetched bill:", bill);
    
            if (bill && bill.orders && bill.orders.length > 0) {
                let billDetails = bill.orders.map(item => `${item.item_name}: ${item.quantity} x ₹${item.price}`).join("<br>");
                addMessage(`Your total bill is:<br>${billDetails}<br><strong>Total: ₹${bill.total}</strong>`, "bot");
                addMessage("How would you like to pay? (cash/online)", "bot");
                orderItems = [];  // ✅ Clear after confirming the bill is received
                currentStep = "payment";
            } else {
                console.error("❌ Bill Error:", bill.error);
                addMessage(`❌ ${bill.error}`, "bot");
            }
            
        } else {
            addMessage("Would you like 'breakfast', 'lunch', or 'beverage' menu?", "bot");
            currentStep = "menu_selection";
        }
        return;
    }
    
    
    
    
    if (currentStep === "payment") {
        if (userText === "online") {
            let qrCodeUrl = "https://i.postimg.cc/pd0mBkVt/QR.jpg";
            addMessage(`Scan this QR code to complete your payment:<br><img src="${qrCodeUrl}" width="200">`, "bot");
            addMessage("💰 Please confirm once you have completed the payment. (Type 'done')", "bot");
            currentStep = "payment_confirmation";
        } else if (userText === "cash") {
            let paymentResponse = await processPayment("cash", currentOrderId);  // Use currentOrderId here
            if (paymentResponse.order_id) {
                addMessage(`🎟 Your Token number is: ${paymentResponse.order_id}`, "bot");
                addMessage("🎉 Please show this Token number at the counter to collect your meal. 🍽", "bot");
            } else {
                addMessage("❌ Payment failed. Please try again.", "bot");
            }
            addMessage("Thank you for ordering! Have a great day! 😊", "bot");
    
            await clearSession();  
            currentStep = "greeting";
        } else {
            addMessage("❌ Invalid option. Please choose 'cash' or 'online'.", "bot");
        }
        return;
    }
    
    if (currentStep === "payment_confirmation" && userText.toLowerCase() === "done") {
        let paymentResponse = await processPayment("online", currentOrderId);
        addMessage(paymentResponse.message, "bot");
        addMessage(`🎟 Your token number is: ${paymentResponse.order_id}`, "bot");
        addMessage("🎉 Please show this Token number at the counter to collect your meal. 🍽", "bot");
        addMessage("Thank you for ordering! Have a great day! 😊", "bot");
    
        await clearSession(); 
        currentStep = "greeting";
    }
    
});



@app.route('/order', methods=['POST'])
def place_order():
    data = request.json
    item_name = data.get("item")

    # Check item availability
    cursor.execute("SELECT item_name, price, stock FROM Menu_item WHERE item_name = %s AND availability = TRUE", (item_name,))
    item = cursor.fetchone()

    if not item or item["stock"] <= 0:
        return jsonify({"message": "Item not available or out of stock."})

    # Reduce stock
    cursor.execute("UPDATE Menu SET stock = stock - 1 WHERE item_name = %s", (item_name,))
    db.commit()

    # Generate unique order ID
    order_id = generate_order_id()

    # Insert order
    cursor.execute("INSERT INTO Orders (order_id, item_name, price, order_date) VALUES (%s, %s, %s, CURDATE())", 
                   (order_id, item["item_name"], item["price"]))
    db.commit()

    return jsonify({"message": f"Your order {order_id} for {item['item_name']} has been placed successfully!"})
 


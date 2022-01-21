const getJSONString = function (obj) { return JSON.stringify(obj, null, 2); }

const express = require('express');     // express will automatically handle get, post, contentType etc... 
const bcrypt = require("bcrypt");
const app = express();
const layouts = require("express-ejs-layouts");
const cookieParser = require("cookie-parser");
const session = require('express-session');
const flash = require('connect-flash');
app.set('view engine', 'ejs');
app.use(layouts);
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var mongoose = require("mongoose");
mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost:27017/cis485", { useUnifiedTopology: true, useNewUrlParser: true });

var loginSchema = new mongoose.Schema({
    userid: String,
    password: String
});

var cartSchema = new mongoose.Schema({
    userid: String,
    code: String,
    name: String,
    price: Number,
    quantity: Number
});

var User = mongoose.model("login", loginSchema);
var Cart = mongoose.model("cart", cartSchema);



app.use(session({
    'secret': '1234567',
    resave: true,
    saveUninitialized: true
}))

app.use(express.json());
app.use(cookieParser("secret_passcode"));
app.use(flash());

app.use((req, res, next) => {
    console.log(`request made to: ${req.url}`);
    next();
});

app.get("/", function (req, res) {
    if (req.session.flag == "1")
        res.render("products.ejs", { message: "", flag: "1" });
    else {
        let x = req.flash("message");
        res.render("login.ejs", { message: x, flag: "" });
    }
});

app.get("/login", function (req, res) {
    let x = req.flash("message");
    res.render("login.ejs", { message: x, flag: "" });
});

app.get("/registration", function (req, res) {
    let x = req.flash("message");
    res.render("registration.ejs", { message: x, flag: "" });
});

app.get("/about", function (req, res) {
    if (req.session.flag == "1")
        res.render("about.ejs", { message: "", flag: "1" });
    else {
        req.flash('message', 'ERROR: Must Login First');
        res.redirect("login");
    }
});

app.get("/products", function (req, res) {
    if (req.session.flag == "1")
        res.render("products.ejs", { message: "", flag: "1" });
    else {
        req.flash('message', 'ERROR: Must Login First');
        res.redirect("login");
    }
});

app.get("/contact", function (req, res) {
    if (req.session.flag == "1")
        res.render("contact.ejs", { message: "", flag: "1" });
    else {
        req.flash('message', 'ERROR: Must Login First');
        res.redirect("login");
    }
});

app.post("/thanks", function (req, res) {
    if (req.session.flag == "1")
        res.render("thanks.ejs", { message: "", flag: "1" });
    else {
        req.flash('message', 'ERROR: Must Login First');
        res.redirect("login");
    }
});


app.get("/logoff", function (req, res) {
    if (req.session.flag == "1")
        res.render("logoff.ejs", { message: "", flag: "1" });
    else res.render("login.ejs", { message: "Must Login First", flag: "" });
});



// --------- register route is for validating and accepting user provided new account info --------- //

app.get("/register", (req, res) => {
    User.findOne({ userid: req.query.userid }, '', function (err, data) {
        if (err) return handleError(err);

        if (data == null) {  // -----> If can't find provided userid, then add it as a new account

            if (req.query.password == "" || req.query.password == undefined) {  // -----> If password is empty
                req.flash('message', "ERROR: Password cannot be empty!");
                res.redirect("registration");
            }
            else if (req.query.password != req.query.password2) {  // -----> If two passwords do not match each others
                req.flash('message', "ERROR: Re-entered password does NOT match the password!");
                res.redirect("registration");
            }
            else {
                bcrypt.hash(req.query.password, 5, function (err, hashpass) {
                    req.query.password = hashpass;  // -----> Hash the password before saving it
                    console.log(req.query);
                    var x = new User(req.query);
                    x.save(function (err) {
                        if (err) return handleError(err);
                        req.flash('message', 'User Stored In Database');
                        res.redirect("login");
                    });
                });
            }
        }
        else {  // -----> If the userid is in the database already, skipp it
            req.flash('message', 'ERROR: User Already In Database');
            res.redirect("registration");
        }
    });
});


// --------- loginx route is for validating user provided username and password info --------- //

app.get("/loginx", (req, res) => {
    User.findOne({ userid: req.query.userid }, '', function (err, data) {
        if (err) return handleError(err);

        if (data == null) { // -----> If no such userid found in DB collection, call out the error
            if (err) return handleError(err);
            req.flash('message', 'ERROR: Invalid Login Information');
            res.redirect("login");
        }
        else {
            bcrypt.compare(req.query.password, data.password,
                function (err, result) {
                    if (result) { // -----> If the provided password match, let the user pass
                        req.session.flag = "1";
                        req.session.userid = req.query.userid;      //store userid into session for future use
                        res.render("products.ejs", { flag: "1", message: "" });
                    }
                    else {  // -----> Provided password doesn't match the one in the collection
                        req.flash('message', 'ERROR: Invalid Password');
                        res.redirect("login");
                    }
                });
        }
    });
});




app.post("/logoff", (req, res) => {
    console.log("POST LOGOFF");
    req.session.destroy(function (err) {
        res.redirect("login");
    });
});



// --------- add route is for adding products into cart --------- //

app.post("/add", (req, res) => {
    console.log("body=" + getJSONString(req.body));
    var msg = "No MSG";
    var flag = 0;
    var message = "";

    const item2find = new Object();     // create a object (or dict...) for storing code and userid data, and check corresponding record in DB collection
    item2find.code = req.body.code;
    item2find.userid = req.session.userid;

    Cart.find(item2find, '', function (err, data) {

        if (err) return handleError(err);   // If run into error, handle the error 

        console.log("result=" + getJSONString(data));  // after search, print data
        if (data == "") console.log("EMPTY");  // If no data find, print Empty to console

        var code = req.body.code;   // store values to variables for convience
        var name = req.body.name;
        var price = req.body.price;
        var quantity = req.body.quantity;
        var userid = req.session.userid;

        console.log("flag=" + flag);
        if (data == "") {   // if no record, then its a new item for this user. Create a new DB obj and add to collection
            const item = new Object();
            item.userid = userid;
            item.code = code;
            item.name = name;
            item.price = price;
            item.quantity = quantity;
            var x = new Cart(item);

            x.save(function (err) {
                if (err) return handleError(err);
                var message = "Item Added to Web Cart";
                console.log(message);
            });
        }
        else {  // if item found, then the user has this item in DB already, update the number for this item
            const item2update = new Object();
            item2update.code = code
            item2update.userid = userid

            console.log("UPDATE QTY=" + data[0].quantity);
            var newQuantity = parseInt(data[0].quantity) + parseInt(quantity);   // add one to the quantity
            const update = new Object();
            update.quantity = newQuantity; // create an obj for storing new quantity, will be used for updateOne for DB collection

            // Format of updateOne: 1st parameter is how to find, 2nd parameter is what to update
            Cart.updateOne(item2update, update, function (err, result) {
                if (err) console.log("ERROR=" + err);   // if error, handle error 
                else console.log("RECORD UPDATED");
            });
        }
        res.render("products.ejs", { flag: req.session.flag, message: "" });
    });
});





// --------- cart route for rendering the cart when clicking on the cart symbol --------- //


app.get("/cart", (req, res) => {

    if (req.session.flag == "1") {

        console.log("body=" + getJSONString(req.body));
        var msg = "No MSG";
        var flag = 0;
        var message = "";

        const item2find = new Object();
        item2find.userid = req.session.userid;  // get pre-stored userid from session, store to a obj, to find a record based on it in DB collection

        Cart.find(item2find, '', function (err, data) {     // from "Cart" collection find data which userid equal the current user

            var cart = ""   // prepare a cart variable for storing cart value later

            if (err) return handleError(err);   // if meet error, then handle error

            console.log("result=" + getJSONString(data));   // if no error, show the data

            if (data == "") {   // If nothing in the cart, then ask user back to products page
                console.log("EMPTY");
                console.log("flag=" + flag);

                var cart = "CART EMPTY<br><a href='/products'>Back To Shopping</a><br>";
                res.render("cart.ejs", { cart: cart, flag: req.session.flag, message: "" });
            }
            else {  // !!!!!!!!! Process for rendering the cart, need to double check, better move the HTML part to the ejs

                cart = "<div class='cart'>"
                    + "<table>"
                    + "<tr>"
                    + "<th>ITEM</th>"
                    + "<th>NAME</th>"
                    + "<th>QTY</th>"
                    + "<th>PRICE</th>"
                    + "<th>SUBTOTAL</th>"
                    + "</tr>";

                var total = 0;      // for getting total cost of all items
                for (var i = 0; i < data.length; i++) {
                    var image = data[i].code + ".jpg";      // get the image name
                    cart += "<tr>"
                        + "<td>" + "<img src='images/" + image + "' class='cart-item-image'" + " />" + "</td>"      // ------ show image ------ //
                        + "<td>" + data[i].name + "</td>"       // ------ show name of the item ------ //

                        + "<td>"    // ------ show quantity and allow user to update or delete ------ //
                        + "<div class='cart-qty-section'>"
                        + "<form method=post action='/change'><input type=hidden name=code value='" + data[i].code + "' />"      // hidden code, will be used in update process
                        + "<input size=3 type=text name=quantity value='" + data[i].quantity + "' />"    // show current quantity 
                        + "<input type=submit value=Update />"      // button for submit new quantity
                        + "</form>"
                        + "<div class='cart-xButton'><a href='/delete:" + data[i].code + "'>" + "<img src='images/x.svg' /></a></div>"      // delete the item by its code 
                        + "</div>"
                        + "</td>"

                        + "<td>$" + data[i].price.toFixed(2) + "</td>"    // ------ show item single price ------ //
                        + "<td>$" + (parseFloat(data[i].price) * parseInt(data[i].quantity)).toFixed(2) + "</td>"     // ------ get item's total price ------ //
                        + "</tr>";
                    total = total + (parseFloat(data[i].price) * parseInt(data[i].quantity));   // calculate aggregated total price of all items
                }
                cart += "<tr>"      // ------ show total price ------ //
                    + "<td colspan=4 id='cart-total'>GRAND TOTAL:</td><td>$" + total.toFixed(2) + "</td>"
                    + "</tr>"
                cart += "</table>" + "</div>";      // ------ wrap the div and table ------ //

                if (total == 0) cart += "<br><a href='/products'>GO BACK SHOPPING</a>";     // ------ if total price is 0, ask user to go back shopping ------ //
                else cart += "<br><div id='cart-checkout-button'><a href='/checkout' class='btn btn-success'>Checkout</a></div>"    // ------ if there are some total price, give user the option to check out ------ //

                res.render("cart.ejs", { cart: cart, flag: req.session.flag, message: "" });
            }

        });
    }
    else {
        req.flash('message', 'ERROR: Must Login First');
        res.redirect("login");
    }

});



// --------- change route for updating the cart quantity in the cart --------- //

app.post("/change", (req, res) => {

    const item2find = new Object();     // create an obj to store item "code" and "userid", so let DB know who's what item need quantity updates
    item2find.code = req.body.code;     // passed from form "post change". Value passed are "code" and "quantity"
    item2find.userid = req.session.userid;

    Cart.find(item2find, '', function (err, data) {
        if (err) return handleError(err);

        var qty = parseInt(req.body.quantity);      // get new quantity value which user typed-in

        if (qty <= 0) {     // if user typed in value <= 0, then delete the record of this item
            Cart.findOneAndDelete(item2find, function (err) {
                if (err) console.log(err);
                console.log("Successful deletion");
            });
        }
        else {     // if user typed in a quantity which > 0, update the quantity for this item record

            const item2update = new Object();   // obj for locating specific record of "userid + item code"
            item2update.code = req.body.code;
            item2update.userid = req.session.userid;

            const update = new Object();    // obj for specifying what quantity to update
            update.quantity = req.body.quantity;

            Cart.updateOne(item2update, update, function (err, result) {
                if (err) console.log("ERROR=" + err);
                else console.log("RECORD UPDATED");
            });
        }
        res.redirect('/cart');
    });
});



// --------- delete:code route for deleting an item based on its code value --------- //

app.get("/delete:code", (req, res) => {

    console.log("param=" + req.params.code);    // get the item's code from url's parameter
    var code = req.params.code.substring(1);    // params' result is ":lgtv"; use substring to remove ":"
    console.log("code=" + code);

    // create a obj for storing the pattern; the pattern will be used to find item in DB colelction (pattern: code + userid)
    const item2find = new Object();
    item2find.code = code;
    item2find.userid = req.session.userid;  // userid is resaved to session for convenience

    Cart.findOneAndDelete(item2find, function (err) {   // delete the item from database 
        if (err) console.log(err);
        console.log("Successful deletion");
    });
    res.redirect('/cart');      // redict to the cart route 
});



// --------- checkout route for checkout the items in the cart --------- //

app.get("/checkout", (req, res) => {

    // checkout actually means delete all items for the user in our DB collection
    const item2delete = new Object();
    item2delete.userid = req.session.userid;

    Cart.deleteMany(item2delete, function (err) {
        if (err) console.log(err);
        console.log("Successful Cart Deletion");
    });

    res.render("checkout.ejs", { flag: req.session.flag, message: "" });
});



app.get("/item1", function (req, res) {
    if (req.session.flag == "1")
        res.render("item1.ejs", { message: "", flag: "1" });
    else {
        req.flash('message', 'ERROR: Must Login First');
        res.redirect("login");
    }
});

app.get("/item2", function (req, res) {
    if (req.session.flag == "1")
        res.render("item2.ejs", { message: "", flag: "1" });
    else {
        req.flash('message', 'ERROR: Must Login First');
        res.redirect("login");
    }
});

app.get("/item3", function (req, res) {
    if (req.session.flag == "1")
        res.render("item3.ejs", { message: "", flag: "1" });
    else {
        req.flash('message', 'ERROR: Must Login First');
        res.redirect("login");
    }
});

app.listen(3000, function () {
    console.log("server is listening!!!");
});





// --------- function to call when user pressed "add to cart" --------- //

const { ConnectionClosedEvent } = require("mongodb");

function add(idx, namex, pricex, quantityx) {
  $('#main_loading').show();
  //$('#item_added').html("hello");
  $.ajax({
    url: "/add",
    cache: false,
    method: "post",
    data:   // These are the data pass to "post add route"
    {
      code: idx,
      name: namex,
      price: pricex,
      quantity: quantityx
    },
    success: function (data) {
      //console.log(data);
      //$('#item_added').html("hello");
    },
    complete: function () {
      $('#img-loading').hide();
      $('#item_added').html("<div style='font-size: 12px;'>" + namex + " Added To Web Cart</div>");
      $('#after-loading').show();
    }
  })
}



// --------- function to control the close of "added to cart" confirmation bubble --------- //

function closeModal() {
  $('#main_loading').hide();
}



// --------- function to get number of items selected in the box --------- //

function itemNum(i) {
  var id = ""
  if ((i == "") || (isNaN(i))) {  // for single item page 
    id = "drop-down-quantity"
  } else {  // for the product page which has multiple items
    id = "drop-down-quantity-" + i;
  }
  var select = document.getElementById(id);
  var qty = select.options[select.selectedIndex].text;
  return qty;
}


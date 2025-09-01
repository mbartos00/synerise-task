class CartManager {
  getCart() {
    const cart = localStorage.getItem("cart");
    return cart ? JSON.parse(cart) : {};
  }

  saveCart(cart) {
    localStorage.setItem("cart", JSON.stringify(cart));
  }

  addProduct(product) {
    const cart = this.getCart();
    const productName = product.name;

    if (cart[productName]) {
      cart[productName].quantity += 1;
    } else {
      cart[productName] = {
        ...product,
        quantity: 1,
      };
    }

    this.saveCart(cart);

    return this.getCart();
  }

  removeProduct(productName) {
    const cart = this.getCart();

    if (cart[productName]) {
      delete cart[productName];
      this.saveCart(cart);
    }

    return this.getCart();
  }

  getTotalValue() {
    const cart = this.getCart();

    return Object.values(cart).reduce((total, product) => {
      return total + product.price * product.quantity;
    }, 0);
  }

  clear() {
    localStorage.removeItem("cart");

    return {};
  }
}

class ProductExtractor {
  priceSelector = '[data-testid*="currentPrice-container"]';
  nameSelector = 'h1[data-testid*="product_title"]';
  imageSelector = 'img[data-testid*="HeroImg"]';
  topPriceLimit = 1000000;
  buyButtonSelector = '[data-testid*="atb-button"]';

  extractPrice() {
    const element = document.querySelector(this.priceSelector);
    const text = element.textContent || element.innerText || "";
    const price = this.parsePrice(text);

    if (price > 0 && price < this.topPriceLimit) {
      return price;
    }

    return 0;
  }

  parsePrice(text) {
    if (!text) return 0;

    const transformedPrice = text.trim().replace(",", ".");
    const price = parseFloat(transformedPrice);

    if (!isNaN(price) && price > 0) {
      return price;
    }

    return 0;
  }

  extractName() {
    const element = document.querySelector(this.nameSelector);
    if (
      element &&
      element.textContent.trim() &&
      element.offsetParent !== null
    ) {
      const name = element.textContent.trim();

      if (name.length > 3) {
        return name;
      }
    }

    return null;
  }

  extractImageUrl() {
    const img = document.querySelector(this.imageSelector);

    if (img && img.src && img.naturalWidth > 100 && img.naturalHeight > 100) {
      return img.src;
    }
  }

  isProductPage() {
    return !!document.querySelector(this.buyButtonSelector);
  }

  extractAll() {
    const name = this.extractName();
    const price = this.extractPrice();

    if (!name || price <= 0) {
      return null;
    }

    return {
      name: name,
      price: price,
      imageUrl: this.extractImageUrl(),
      url: window.location.href,
      addedAt: new Date().toISOString(),
    };
  }
}

class CartUI {
  static instance = null;
  static PANEL_ID = "universal-cart-panel";

  panel = null;
  cartManager = null;

  constructor() {
    if (CartUI.instance) {
      return CartUI.instance;
    }

    this.cartManager = new CartManager();
    CartUI.instance = this;
  }

  createPanel() {
    this.cleanup();

    this.panel = document.createElement("div");
    this.panel.id = CartUI.PANEL_ID;
    this.panel.style.cssText = `
            position: fixed;
            bottom: 200px;
            right: 20px;
            width: 350px;
            max-height: 500px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            overflow-y: scroll;
            transition: opacity 0.3s ease;
        `;

    document.body.appendChild(this.panel);
    this.render();
  }

  cleanup() {
    const existingPanels = document.querySelectorAll(`#${CartUI.PANEL_ID}`);
    existingPanels.forEach((panel) => panel.remove());

    this.panel = null;
  }

  render() {
    if (!this.panel) return;

    const cart = this.cartManager.getCart();
    const products = Object.values(cart);
    const total = this.cartManager.getTotalValue();

    let html = `
            <div style="padding: 15px; border-bottom: 1px solid #eee; background: #f8f9fa;">
                <h3 style="margin: 0; color: #333;">Shopping Cart (${products.length})</h3>
                <button class="close-btn" 
                        style="float: right; margin-top: -25px; background: none; border: none; font-size: 18px; cursor: pointer;">×</button>
            </div>
            <div style="padding: 15px;">
        `;

    if (products.length === 0) {
      html +=
        '<p style="text-align: center; color: #666; margin: 20px 0;">Cart is empty</p>';
    } else {
      products.forEach((product) => {
        const totalPrice = (product.price * product.quantity).toFixed(2);
        html += `
                    <div style="display: flex; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #eee;">
                        ${
                          product.imageUrl
                            ? `<img src="${product.imageUrl}" alt="${product.name}" 
                                 style="width: 50px; height: 50px; object-fit: cover; margin-right: 10px; border-radius: 4px;"
                                 onerror="this.style.display='none'">`
                            : '<div style="width: 50px; height: 50px; background: #f0f0f0; margin-right: 10px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 12px;">📦</div>'
                        }
                        <div style="flex: 1; margin-right: 10px;">
                            <div style="font-weight: bold; margin-bottom: 5px; line-height: 1.3; max-height: 40px; overflow: hidden;">
                                ${
                                  product.name.length > 50
                                    ? product.name.substring(0, 50) + "..."
                                    : product.name
                                }
                            </div>
                            <div style="color: #666; font-size: 12px;">
                                Qty: ${
                                  product.quantity
                                } × ${product.price.toFixed(2)} = ${totalPrice}
                            </div>
                        </div>
                        <button class="remove-btn" data-product-name="${
                          product.name
                        }"
                                style="background: #ff4444; color: white; border: none; padding: 5px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            Remove
                        </button>
                    </div>
                `;
      });

      html += `
                <div style="border-top: 2px solid #333; padding-top: 15px; margin-top: 15px;">
                    <div style="font-weight: bold; font-size: 16px; text-align: right;">
                        Total: ${total.toFixed(2)}
                    </div>
                    <div style="margin-top: 10px;">
                        <button class="clear-btn"
                                style="background: #dc3545; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-size: 12px; width: 100%;">
                            Clear Cart
                        </button>
                    </div>
                </div>
            `;
    }

    html += "</div>";
    this.panel.innerHTML = html;

    this.attachEventListeners();
  }

  attachEventListeners() {
    if (!this.panel) return;

    this.panel.querySelectorAll(".remove-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const productName = btn.dataset.productName;
        this.cartManager.removeProduct(productName);

        this.render();
      });
    });

    const clearBtn = this.panel.querySelector(".clear-btn");
    if (clearBtn) {
      clearBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        this.cartManager.clear();
        this.render();
      });
    }

    const closeBtn = this.panel.querySelector(".close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        this.close();
      });
    }
  }

  close() {
    this.cleanup();
  }

  static getInstance() {
    if (!CartUI.instance) {
      CartUI.instance = new CartUI();
    }
    return CartUI.instance;
  }
}

class ControlButtons {
  static instance = null;
  static CONTAINER_ID = "cart-controls";

  cartManager = null;
  cartUI = null;
  productExtractor = null;
  container = null;

  constructor() {
    if (ControlButtons.instance) {
      return ControlButtons.instance;
    }

    this.productExtractor = new ProductExtractor();
    this.cartManager = new CartManager();
    this.cartUI = CartUI.getInstance();
    ControlButtons.instance = this;
  }

  create() {
    const existingContainer = document.getElementById(
      ControlButtons.CONTAINER_ID
    );
    if (existingContainer) {
      existingContainer.remove();
    }

    this.container = document.createElement("div");
    this.container.id = ControlButtons.CONTAINER_ID;
    this.container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            z-index: 9999;
        `;

    const addButton = this.createButton("Add to Cart", "#007bff", () => {
      const product = this.productExtractor.extractAll();

      if (product) {
        this.cartManager.addProduct(product);
        this.cartUI.createPanel();
      } else {
        alert(
          "Could not extract product information from this page.\nMake sure you are on a product page with visible price and product name."
        );
      }
    });

    const showButton = this.createButton("Show Cart", "#28a745", () => {
      if (document.getElementById(CartUI.PANEL_ID)) {
        return;
      }

      this.cartUI.createPanel();
    });

    this.container.appendChild(addButton);
    this.container.appendChild(showButton);
    document.body.appendChild(this.container);
  }

  createButton(text, color, onclick) {
    const button = document.createElement("button");

    button.innerHTML = text;
    button.onclick = onclick;
    button.style.cssText = `
            background: ${color};
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
        `;

    button.onmouseover = () => (button.style.transform = "scale(1.05)");
    button.onmouseout = () => (button.style.transform = "scale(1)");

    return button;
  }

  static getInstance() {
    if (!ControlButtons.instance) {
      ControlButtons.instance = new ControlButtons();
    }
    return ControlButtons.instance;
  }
}

function initializeCart() {
  const cartUI = CartUI.getInstance();
  const controlButtons = ControlButtons.getInstance();
  const productExtractor = new ProductExtractor();

  console.log("🛒 Universal Cart Script Loaded");
  console.log("📍 Current URL:", window.location.href);

  if (!productExtractor.isProductPage()) {
    alert("Product page not found");

    return;
  }

  cartUI.createPanel();
  controlButtons.create();
}

CartUI.instance = null;
ControlButtons.instance = null;

initializeCart();

console.log("🎉 Cart script initialized!");

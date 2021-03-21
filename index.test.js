const { Builder, By, Key, until, Actions } = require("selenium-webdriver");

(async function example() {
  let driver = await new Builder().forBrowser("firefox").build();
  try {
    await driver.get("http://localhost:3000");
    await driver.findElement(By.id("pac-input")).sendKeys("Östersund");
    await driver.wait(
      until.elementIsVisible(driver.findElement(By.id("pac-input"))),
      5000
    );
    await driver
      .actions()
      .move({ x: -50, y: 20, origin: driver.findElement(By.id("pac-input")) })
      .perform()
      .then(() => driver.actions().click().perform());
    await driver.wait(until.titleIs("webdriver - Google Search"), 4000);
  } finally {
    await driver.quit();
  }
})();

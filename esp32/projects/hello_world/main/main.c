#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "esp_log.h"

static const char *TAG = "GPIO_SCAN";

// Define safe GPIOs to test - explicitly EXCLUDING GPIO 18 & 19 (UART pins)
// Also excluding other potentially dangerous pins
const int safe_gpios[] = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
const int num_gpios = sizeof(safe_gpios) / sizeof(safe_gpios[0]);

void app_main(void)
{
    int current_gpio_index = 0;
    
    ESP_LOGI(TAG, "Starting safe GPIO scan for LED");
    ESP_LOGI(TAG, "IMPORTANT: Press RST button if you see the LED light up!");
    
    // Configure all GPIOs as outputs first
    for (int i = 0; i < num_gpios; i++) {
        gpio_reset_pin(safe_gpios[i]);
        gpio_set_direction(safe_gpios[i], GPIO_MODE_OUTPUT);
        gpio_set_level(safe_gpios[i], 0);  // Start with all LEDs off
    }

    while (1) {
        // Turn off previous GPIO
        if (current_gpio_index > 0) {
            gpio_set_level(safe_gpios[current_gpio_index - 1], 0);
        } else {
            gpio_set_level(safe_gpios[num_gpios - 1], 0);  // Turn off last GPIO if we're at start
        }

        // Turn on current GPIO
        ESP_LOGI(TAG, "Testing GPIO %d", safe_gpios[current_gpio_index]);
        gpio_set_level(safe_gpios[current_gpio_index], 1);
        
        // Wait 3 seconds on each pin
        vTaskDelay(pdMS_TO_TICKS(3000));
        
        // Move to next GPIO
        current_gpio_index = (current_gpio_index + 1) % num_gpios;
    }
} 
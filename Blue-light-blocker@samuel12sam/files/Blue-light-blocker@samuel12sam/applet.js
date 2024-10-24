/*  ========================================================================================================================================================
    ================================================= CREDITS FOR THE XSCT EXECUTABLE USED IN THIS APPLET: =================================================
    ========================================================================================================================================================
    
    https://github.com/faf0/sct
    
        "Xsct (X11 set color temperature) is a UNIX tool which allows you to set the color temperature of your screen. It is simpler than Redshift and f.lux.
         Original code was published by Ted Unangst in the public domain: https://www.tedunangst.com/flak/post/sct-set-color-temperature"
    

    xsct is PUBLIC DOMAIN (using the "Unlicense license") For more information, please refer to <http://unlicense.org/>
    For more information about xsct, head over to <https://github.com/faf0/sct>
*/

/*  ========================================================================================================================================================
    ===================================================== CREDITS FOR THE BLUE LIGHT BLOCKER APPLET: =======================================================
    ========================================================================================================================================================
    
    Copyright 2024 samuel12sam
    Licensed under the MIT License.
    See the LICENSE file in the project root for more information.
 
    name:               samuel12sam
    date of creation:   15    September   2024
    last update:        24     October     2024
    

    Blue Light Blocker is an applet that allows users to change the color temperature and brightness of their screen using a 
    simple user interface.

    This applet gives total control to the user, the color temperature of the screen is not dictated by what time of the day it is.

    A "Batteries-included" version of this applet is available here :
    https://github.com/samuel12sam/BlueLightBlocker
    Simply follow the Manual Installation which takes no longer than a few seconds
    
    TODO: put repeating lines of code in a function... (creating sliders, connecting signals...etc...)
    TODO: add translations
    TODO: allow the user to display a custom format for the color temperature in brightness info in the panel
    TODO: allow the user to display a custom logo in the panel for the applet

    
*/

// pull: https://github.com/linuxmint/cinnamon-spices-applets

// ================== IMPORTS ====================
const GObject = imports.gi.GObject;
const Slider = imports.ui.slider;
const Applet = imports.ui.applet;
const Util = imports.misc.util;
const Mainloop = imports.mainloop;
const Lang = imports.lang;
const PopupMenu = imports.ui.popupMenu;
const GLib = imports.gi.GLib;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const Settings = imports.ui.settings;


// ================================================================== CONSTANTS ==================================================================
const UUID = 'Blue-light-blocker@samuel12sam';
const MAX_TEMP_VALUE = 8000
const MIN_TEMP_VALUE = 1000
const RANGE_TEMP_VALUES = (MAX_TEMP_VALUE - MIN_TEMP_VALUE)
const MAX_BRIGHTNESS_VALUE = 1
const MIN_BRIGHTNESS_VALUE = 0.2 //safety value, to prevent user from setting brightness to 0 accidently
const RANGE_BRIGHTNESS_VALUES = (MAX_BRIGHTNESS_VALUE - MIN_BRIGHTNESS_VALUE)
const ENABLED = true;
const DISABLED = false;



// ============================================================= BLUE LIGHT BLOCKER APPLET =======================================================

function BlueLightBlockerApplet(metadata, orientation, panel_height, instance_id) {
    this._init(metadata, orientation, panel_height, instance_id);
}


BlueLightBlockerApplet.prototype = {
    __proto__: Applet.TextIconApplet.prototype,

    _init: function(metadata, orientation, panel_height, instance_id) {
        Applet.TextIconApplet.prototype._init.call(this, orientation, panel_height, instance_id);
        
        try {
            // =======================================================================
            // =                DECLARE / INITIALIZE CLASS ATTRIBUTES                =
            // =======================================================================
            this.xsct_exec;
            this.menuManager;
            this.menu;
            this.container;
            this.installButton_activate_signal_id
            this.metadata = metadata
            this.appletToggleSwitch;
            this.currentTemp;
            this.currentBrightness;
            this.tempSliderItem;
            this.brightSliderItem;
            this.tempLabel;
            this.brightLabel;
            this.tempSliderHeadPositionOnLoad;
            this.brightSliderHeadPositionOnLoad;
            this.submenuContainer;
            this.appletToggleSwitch_toggled_signal_id
            this.tempSliderItem_drag_end_signal_id
            this.tempSliderItem_value_changed_signal_id
            this.brightSliderItem_drag_end_signal_id
            this.brightSliderItem_value_changed_signal_id

       

            // =======================================================================
            // =                                SET UP                               =
            // =======================================================================
            // to see these logs, press ALT+F2, type in : lg, and press enter to open Melange. Then head over to the Log tab.
            global.log("Setting up the Blue Light Blocker applet...")
            this._load_xsct_executable()

            this.currentTemp = this._get_temperature()
            this.currentBrightness = this._get_brightness()

            this.settings = new Settings.AppletSettings(this, metadata.uuid, instance_id);
            this._bind_settings();

            // only runs if the 'Automatically enable Blue Light Blocker' option has been enabled by the user in the applet's configuration settings
            this.applyTempAndBrightnessOnBoot();
            
            // set the system tray text of the Applet to display the current color temperature and brightness on load.
            this._set_tray_text(this.tray_text_format, this.currentTemp, this.currentBrightness)
    
            // set the system tray icon using the icon filename
            this.set_applet_icon_name("icon");

            // set the system tray tooltip description that appears when hovering the applet with the mouse cursor
            this.set_applet_tooltip(_("Set color temperature and brightness"));

            //normalizing the position of the head of the slider on the track.
            this.tempSliderHeadPositionOnLoad = this.currentTemp / MAX_TEMP_VALUE;  
            // if the value of tempSliderHeadPositionOnLoad is bigger than the maximum possible value of 1 for the slider track, set the current temperature to max. 
            if(this.tempSliderHeadPositionOnLoad > 1) {
                this.tempSliderHeadPositionOnLoad = 1;
                this._set_temperature(MAX_TEMP_VALUE); 
            } 
            // if the value of tempSliderHeadPositionOnLoad is lower than the minimum possible value of 0 for the slider track, set the current temperature to min. 
            else if (this.tempSliderHeadPositionOnLoad < 0) {
                this.tempSliderHeadPositionOnLoad = 0;
                this._set_temperature(MIN_TEMP_VALUE);
            }

            //normalizing the position of the head of the slider on the track.
            this.brightSliderHeadPositionOnLoad = this.currentBrightness / MAX_BRIGHTNESS_VALUE;
            // if the value of brightSliderHeadPositionOnLoad is bigger than the maximum possible value of 1 for the slider track, set the current brightness to max. 
            if(this.brightSliderHeadPositionOnLoad > 1) {
                this.brightSliderHeadPositionOnLoad = 1;
                this._set_brightness(MAX_BRIGHTNESS_VALUE); 
            } 
            // if the value of brightSliderHeadPositionOnLoad is lower than the minimum possible value of 0 for the slider track, set the current brightness to min. 
            else if (this.brightSliderHeadPositionOnLoad < 0) {
                this.brightSliderHeadPositionOnLoad = 0;
                this._set_brightness(MIN_BRIGHTNESS_VALUE);
            }
            


            // =======================================================================
            // =                  CREATE THE APPLET'S UI COMPONENTS                  =
            // =======================================================================
            global.log("Assembling the Blue Light Blocker applet...")

            // Create the popup menu
            this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.menu = new Applet.AppletPopupMenu(this, orientation);
            // Set a maximum width for the popup menu
            this.menu.box.add_style_class_name('popup-menu-custom');
            this.menuManager.addMenu(this.menu);


            // Create the applet toggle switch
            this.appletToggleSwitch = new PopupMenu.PopupSwitchMenuItem(_("Enable Blue Light Blocker"));

            if(this.launchAppletOnBoot) {
                this.appletToggleSwitch.setToggleState(true)
            }

            // Create a horizontal container to hold both the text label and the PopupBaseMenuItem (download button)
            this.container = new St.BoxLayout({
                style_class: 'my-container'  // Optional CSS class for styling
            });

            // Create a label (text) that will be on the left of the download button
            let label = new St.Label({
                text: "BlueLightBlocker requires 'xsct' to function :",
                style_class: 'my-container-msg'
            });


            // Create a PopupBaseMenuItem that acts like a button
            this.downloadMenu = new PopupMenu.PopupMenuItem("Download Package", { reactive: true});
            this.downloadMenu.actor.add_style_class_name("download-btn");  // Custom button styling


            // Add the label (text) and PopupBaseMenuItem (button) to the container
            this.container.add_child(label);          // Add label on the left
            this.container.add_child(this.downloadMenu.actor); // Add the PopupBaseMenuItem on the right

            this.menu.box.add_child(this.container)
            

            // Add the applet toggle switch to the popupmenu
            this.menu.addMenuItem(this.appletToggleSwitch);

            
            
            // Create a css-stylable custom container to put the text labels and the sliders inside
            this.customContainer = new PopupMenu.PopupMenuSection();
            this.customContainer.actor.add_style_class_name('my-custom-section');
            this.menu.addMenuItem(this.customContainer);



            // Create a Text Label with St.Label because PopupMenu.PopupMenuItem has the expand proprety that makes the slider have more width i think... and St.Label is easier to style
            // old : 
            this.tempLabel = new St.Label({ 
                text: `Color temperature: ${this.dependencies_installed() ? this.currentTemp: '???'} K`, 
                style_class: 'textLabel',
            });


            // Create a Text Label with St.Label because PopupMenu.PopupMenuItem has the expand proprety that makes the slider have more width i think... and St.Label is easier to style
            // old : 
           
            this.brightLabel = new St.Label({ 
                text: `Brightness: ${this.dependencies_installed()? Math.round(this.currentBrightness*100): '???'} %`, 
                style_class: 'textLabel',
            });


            if(this.enableAccessibleSliders) {
                // Create a color temperature slider
                this.tempSliderItem  = new PopupMenu.PopupSliderMenuItem(this.tempSliderHeadPositionOnLoad); // Initialize with a value between 0 and 1
                this.brightSliderItem  = new PopupMenu.PopupSliderMenuItem(this.brightSliderHeadPositionOnLoad); // Initialize with a value between 0 and 1
            } else {
                // Create a brightness slider
                this.tempSliderItem  = new Slider.Slider(this.tempSliderHeadPositionOnLoad); // Initialize with a value between 0 and 1
                this.brightSliderItem  = new Slider.Slider(this.brightSliderHeadPositionOnLoad); // Initialize with a value between 0 and 1

            }



            // Add the text label and the color temperature slider to the custom container
            this.customContainer.addActor(this.tempLabel); // Set 'expand' to false if needed
            this.customContainer.addActor(this.tempSliderItem.actor, {expand:false}); // Set 'expand' to false if needed
            this.customContainer.addActor(this.brightLabel); // Set 'expand' to false if needed
            this.customContainer.addActor(this.brightSliderItem.actor, {expand:false}); // Set 'expand' to false if needed







            // =======================================================================
            // =                    SIGNALS AND CALLBACK FUNCTIONS                   =
            // =======================================================================

            // DOWNLOAD BUTTON:                 function to handle click event when pressing the download button to download xsct
            this.installButton_activate_signal_id = this.downloadMenu.connect('activate', () => {
                this.install_dependencies_prompt()
                this.on_applet_clicked() //to register the popupmenu closing  
            });

            
            // APPLET TOGGLE SWITCH:            when enabling or disabling the applet...
            this.appletToggleSwitch_toggled_signal_id = this.appletToggleSwitch.connect('toggled', (item, value) => {
                if(value == ENABLED) {  
                    this._set_temperature(this.currentTemp);
                    this._set_brightness(this.currentBrightness);
                    this._set_tray_text(this.tray_text_format, this.currentTemp, this.currentBrightness)
                    this.showAllSliders()
                } else if (value == DISABLED) {
                    this._reset_temperature_and_brightness();
                    this._set_tray_text(this.tray_text_format, 6500, 1)
                    this.hideAllSliders()
                }
            });


            // COLOR TEMPERATURE SLIDER:        when you finished dragging the slider...
            // the signal 'drag-end' only passes the slider argument, while the signal 'value-changed' passes slider and value arguments
            this.tempSliderItem_drag_end_signal_id = this.tempSliderItem.connect('drag-end', (slider)=> {
                this.appletToggleSwitch.state && this._set_tray_text(this.tray_text_format, this.currentTemp, this.currentBrightness)
            });

            // COLOR TEMPERATURE SLIDER:        when you are dragging the slider...
            this.tempSliderItem_value_changed_signal_id = this.tempSliderItem.connect('value-changed', (slider, value)=> {
                this.currentTemp = Math.round(value * RANGE_TEMP_VALUES ) + MIN_TEMP_VALUE
                this.setTempLabelText(`Color temperature: ${this.dependencies_installed()? this.currentTemp: '???'} K`) 
                //this.tempSliderLabelItem.label.text = `Color Temperature: ${this.currentTemp} K`; // GUI Label Colour:
                this.appletToggleSwitch.state && this._set_temperature(this.currentTemp) // only modify the screen's color temperature if the switch it turned on (enabled)
            });

            // BRIGHTNESS SLIDER:        when you finished dragging the slider...
            // the signal 'drag-end' only passes the slider argument, while the signal 'value-changed' passes slider and value arguments
            this.brightSliderItem_drag_end_signal_id = this.brightSliderItem.connect('drag-end', (slider)=> {
                this.appletToggleSwitch.state && this._set_tray_text(this.tray_text_format, this.currentTemp, this.currentBrightness)
            });

            // BRIGHTNESS SLIDER:        when you are dragging the slider...
            this.brightSliderItem_value_changed_signal_id = this.brightSliderItem.connect('value-changed', (slider, value)=> {
                this.currentBrightness = value * (MAX_BRIGHTNESS_VALUE - MIN_BRIGHTNESS_VALUE) + MIN_BRIGHTNESS_VALUE;
                this.setBrightnessLabelText(`Brightness: ${this.dependencies_installed() ? Math.round(this.currentBrightness*100): '???'} %`) 
                this.appletToggleSwitch.state && this._set_brightness(this.currentBrightness) // only modify the screen's color temperature if the switch it turned on (enabled)
            });

            global.log("...Successful creation of the Blue Light Blocker applet")
        } catch (e) {
            global.logError(e);
        }
    },




    // ===================================================== APPLET'S SPECIAL FUNCTIONS =======================================================

    
    // When the applet is clicked in the system tray
    on_applet_clicked: function() {
        try {
            if(this.dependencies_installed()){
                // this.removeStatusItem()
                this.container.hide()
                this.setTempLabelText(`Color temperature: ${this.currentTemp} K`);
                this.setBrightnessLabelText(`Brightness: ${Math.round(this.currentBrightness*100)} %`);
                if(this.appletToggleSwitch.state) {
                    this.showAllSliders()
                } else {
                    this.hideAllSliders()
                }
                this.menu.toggle();
                
            } else {
                this.container.show()
                this.showAllSliders()
                this.setTempLabelText(`Color temperature: ${'???'} K`);
                this.setBrightnessLabelText(`Brightness: ${'???'} %`);
                this.menu.toggle();
            }
        } catch(e) {
            global.logError(e)
        }
    },

    // When the applet is removed from the panel, cleanup function
    on_applet_removed_from_panel: function () {
        try {
            global.log("Removing/Cleaning up the Blue Light Blocker applet...")
            this._reset_temperature_and_brightness()
            
            this.downloadMenu.disconnect(this.installButton_activate_signal_id);

            this.appletToggleSwitch.disconnect(this.appletToggleSwitch_toggled_signal_id)
            this.tempSliderItem.disconnect(this.tempSliderItem_drag_end_signal_id);
            this.tempSliderItem.disconnect(this.tempSliderItem_value_changed_signal_id);
            this.brightSliderItem.disconnect(this.brightSliderItem_value_changed_signal_id);
            this.brightSliderItem.disconnect(this.brightSliderItem_drag_end_signal_id);


            this.xsct_exec = null;
            this.menuManager.destroy();
            this.menuManager = null;
            this.menu.destroy();
            this.menu = null;
            this.appletToggleSwitch.destroy();
            this.appletToggleSwitch = null;
            this.currentTemp = null;
            this.currentBrightness = null;
            
            if(this.enableAccessibleSliders) {
                this.tempSliderItem.destroy();
                this.brightSliderItem.destroy();
                
            } else {
                // If you have not enabled Accessible Sliders, you are using Slider.Slider widget which doesnt have a .destroy() method. 
                // In order to clean them up, it is sufficient to simply remove them from their container and clearing their reference in order
                // to allow garbage collection to deal with it.
                this.customContainer.box.get_children().forEach(child => {
                    this.customContainer.box.remove_actor(child);
                });
            }

            this.tempSliderItem = null;
            this.brightSliderItem = null;

            this.tempLabel.destroy();
            this.tempLabel = null;
            this.brightLabel.destroy();
            this.brightLabel = null;
            this.tempSliderHeadPositionOnLoad = null;
            this.brightSliderHeadPositionOnLoad = null;
            this.customContainer.destroy();
            this.customContainer = null;
            this.installButton_activate_signal_id = null
            this.appletToggleSwitch_toggled_signal_id = null;
            this.tempSliderItem_drag_end_signal_id = null;
            this.tempSliderItem_value_changed_signal_id = null;
            this.brightSliderItem_drag_end_signal_id = null;
            this.brightSliderItem_value_changed_signal_id = null;
            global.log("...Successful removal/clean up ")
            this.uninstall_dependencies_prompt()

        } catch (e) {
            global.logError(e)
        }
	},



    // ============================================================= CUSTOM METHODS =======================================================

    uninstall_dependencies_prompt() {
        // Uninstall the package using apt-get
        if(Gio.file_new_for_path("/usr/bin/xsct").query_exists(null)) {
            Util.spawn_async(["pkexec", "apt-get", "remove", "--purge", "xsct", "-y"], null);
            // Send a notification to inform the user that the package is being uninstalled
            Util.spawnCommandLine('notify-send --hint=int:transient:1 "' + _("Asking permission to uninstall the '%s' package.").format('xsct') + '" -i ' + this.metadata.path + '/icon.png');
        }
    
    },

    showAllSliders() {
        this.tempSliderItem.actor.show();
        this.brightSliderItem.actor.show();
        this.tempLabel.show()
        this.brightLabel.show()
    },

    hideAllSliders() {
        this.tempSliderItem.actor.hide();
        this.brightSliderItem.actor.hide();
        this.tempLabel.hide()
        this.brightLabel.hide()
    },

    // Changes the text label above the color temperature slider
    setTempLabelText(textString) {
        this.tempLabel.set_text(textString);
    },

    // Changes the text label above the brightness slider
    setBrightnessLabelText(textString) {
        this.brightLabel.set_text(textString);
    },

    // resets the screen's color temperature and brightness to it's default values -> 6500K (100%)
    _reset_temperature_and_brightness() {
        this._run_cmd(`${this.xsct_exec} 0`);
    },

    // run a shell command
    _run_cmd: function(command) {
      try {
        let [success, stdout, stderr, exitStatus] = GLib.spawn_command_line_sync(`/usr/bin/env sh -c "${command}"`);
        
        // Check if the command was successful
        if (success && exitStatus === 0) {
            // Convert the output from a byte array to a string
            let result = stdout.toString();
            // Remove any trailing newlines or whitespace
            result = result.trim();
            return result;
        } else {
            if(this.xsct !== null){
                // Handle errors or unsuccessful command execution
                global.logError(`Command failed: ${command}`);
                global.logError(`Error output: ${stderr}`);
                return null;
            }
        }
    } catch (e) {
        global.logError(`Failed to run command: ${e}`);
        return null;
    }

      return "";
    },


    // Modify the system tray displayed text according to the correct format which can be modified by the user in the applet's configuration settings
    _set_tray_text(formatOption, temp, brightness) {
        if(this.xsct !== null) {
            switch(formatOption) {
                case "default":
                    this.set_applet_label(`${temp} K (${Math.round(brightness*100)}%)`)
                    break;
                case "onlyTemperature":
                    this.set_applet_label(`${temp} K`)
                    break;
                case "onlyBrightness":
                    this.set_applet_label(`${Math.round(brightness*100)}%`)
                    break;
                case "none":
                    this.set_applet_label('')
                    break;
                default:
                    break;
    
            }
        } else {
            this.set_applet_label(`6500 K (100%)`)
        }
    },

    // get the current color temperature value using the xsct executale
    _get_temperature() {
        try{
            let temperature = this._run_cmd(`${this.xsct_exec} | grep -Eo '([^.0-9])([0-9]{4})' | sed -E 's/[^0-9]//g'`)

            temperature = parseInt(temperature)

            if (Number.isInteger(temperature)) {
                return temperature;
            } else {
                return 6500;
            }
        } catch(e) {
            global.logError("Could not get the screen's color temperature. Perhaps 'xsct' is missing.")
            return '???'
        }
    },

    // get the current brightness value using the xsct executale (values range from 0 to 1)
    _get_brightness() {
        try {
            let brightness = this._run_cmd(`${this.xsct_exec} | grep -Eo '([0-1])\.([0-9]{2})'`)
    
            brightness = parseFloat(brightness);
    
            // checks brightness is a number to begin with, and checks if it is not an int, ie: if it is a float
            if(!Number.isNaN(brightness) && !Number.isInteger(brightness)) {
                return brightness;
            } else {
                return 1.00;
            }
        } catch (e) {
            return '???'
        }
    },

    // set a new color temperature value using the xsct executable
    _set_temperature(temp) {
        if(this.xsct_exec){
            // Keeping only the last 4 digits of the entered temp value because I absolutely refuse to let anyone use this function to get color temperatures
            // exceeding 9999 K. Your eyes deserve better.
            let temp_str = temp.toString();
            let last_4_digits_of_temp = Number(temp_str.slice(-4));
            let new_temp = last_4_digits_of_temp

            this._run_cmd(`${this.xsct_exec} ${new_temp}`);
        }
    },

    // set a new brightness value using the xsct executable
    _set_brightness(brightness) {
        if(this.xsct_exec){

            // the passed param must be a float number
            if(!Number.isNaN(brightness) && !Number.isInteger(brightness)) {
                if(brightness < MIN_BRIGHTNESS_VALUE) {
                    this._run_cmd(`${this.xsct_exec} ${this.currentTemp} ${MIN_BRIGHTNESS_VALUE}`)
                } else if(brightness > MAX_BRIGHTNESS_VALUE){
                    this._run_cmd(`${this.xsct_exec} ${this.currentTemp} ${MAX_BRIGHTNESS_VALUE}`);
                } else {
                    this._run_cmd(`${this.xsct_exec} ${this.currentTemp} ${brightness}`);
                }
            }
        }
    },

    // Bind the settings in ./settings-schema.json to class attributes of the same name
    _bind_settings: function () {
        for(let [binding, property_name, callback] of [
                        [Settings.BindingDirection.IN, "launchAppletOnBoot", null],
                        [Settings.BindingDirection.IN, "defaultTempValueOnBoot", null],
                        [Settings.BindingDirection.IN, "defaultBrightnessPercentageValueOnBoot", null],
                        [Settings.BindingDirection.IN, "tray_text_format", this.on_tray_text_format_changed],
                        [Settings.BindingDirection.IN, "enableAccessibleSliders", this.on_enable_accessible_sliders_changed],
                    ]) {
                this.settings.bindProperty(binding, property_name, property_name, callback, null);
        }
    },

    _load_xsct_executable() {
        try {
            if(Gio.file_new_for_path("/usr/bin/xsct").query_exists(null)) {
                if(this.xsct_exec == null) {
                    global.log("The `xsct` package was successfully found in '/usr/bin'.")
                    this.xsct_exec = "xsct";
                }
            } else {
                global.log("The `xsct` package was not found in '/usr/bin'...")
                this.xsct_exec = null;
            }
        } catch(e) {
            this.xsct_exec = null
            global.log("Error caught while loading xsct executable: " + e);
        }
    },

    // Callback for when the user changes the value of 'Applet panel text format' in the applet's configuration settings
    on_tray_text_format_changed() {
        //update the text displayed int he system tray by the applet
        this._set_tray_text(this.tray_text_format, this.currentTemp, this.currentBrightness);
    },

    // Callback for when the user changes the value of 'Enable accessible sliders' in the applet's configuration settings
    on_enable_accessible_sliders_changed() {
        this.customContainer.box.get_children().forEach(child => {
            this.customContainer.box.remove_actor(child);
        });

        this.tempSliderItem.disconnect(this.tempSliderItem_drag_end_signal_id);
        this.tempSliderItem.disconnect(this.tempSliderItem_value_changed_signal_id);
        this.brightSliderItem.disconnect(this.brightSliderItem_value_changed_signal_id);
        this.brightSliderItem.disconnect(this.brightSliderItem_drag_end_signal_id);

        if(this.enableAccessibleSliders) {
            // Create an accessible color temperature slider
            this.tempSliderItem  = new PopupMenu.PopupSliderMenuItem(this.tempSliderHeadPositionOnLoad); // Initialize with a value between 0 and 1
            // Create an accessible brightness slider
            this.brightSliderItem  = new PopupMenu.PopupSliderMenuItem(this.brightSliderHeadPositionOnLoad); // Initialize with a value between 0 and 1

            // COLOR TEMPERATURE SLIDER:        when you finished dragging the slider...
            // the signal 'drag-end' only passes the slider argument, while the signal 'value-changed' passes slider and value arguments
            this.tempSliderItem_drag_end_signal_id = this.tempSliderItem.connect('drag-end', (slider)=> {
                this.appletToggleSwitch.state && this._set_tray_text(this.tray_text_format, this.currentTemp, this.currentBrightness)
            });

            // COLOR TEMPERATURE SLIDER:        when you are dragging the slider...
            this.tempSliderItem_value_changed_signal_id = this.tempSliderItem.connect('value-changed', (slider, value)=> {
                this.currentTemp = Math.round(value * RANGE_TEMP_VALUES ) + MIN_TEMP_VALUE
                this.setTempLabelText(`Color temperature: ${this.dependencies_installed()? this.currentTemp: '???'} K`) 
                this.appletToggleSwitch.state && this._set_temperature(this.currentTemp) // only modify the screen's color temperature if the switch it turned on (enabled)
            });

            // BRIGHTNESS SLIDER:        when you finished dragging the slider...
            // the signal 'drag-end' only passes the slider argument, while the signal 'value-changed' passes slider and value arguments
            this.brightSliderItem_drag_end_signal_id = this.brightSliderItem.connect('drag-end', (slider)=> {
                this.appletToggleSwitch.state && this._set_tray_text(this.tray_text_format, this.currentTemp, this.currentBrightness)
            });

            // BRIGHTNESS SLIDER:        when you are dragging the slider...
            this.brightSliderItem_value_changed_signal_id = this.brightSliderItem.connect('value-changed', (slider, value)=> {
                this.currentBrightness = value * (MAX_BRIGHTNESS_VALUE - MIN_BRIGHTNESS_VALUE) + MIN_BRIGHTNESS_VALUE;
                this.setBrightnessLabelText(`Brightness: ${this.dependencies_installed()? Math.round(this.currentBrightness*100): '???'} %`) 
                this.appletToggleSwitch.state && this._set_brightness(this.currentBrightness) // only modify the screen's color temperature if the switch it turned on (enabled)
            });

            
            this.customContainer.addActor(this.tempLabel)
            this.customContainer.addActor(this.tempSliderItem.actor)
            this.customContainer.addActor(this.brightLabel)
            this.customContainer.addActor(this.brightSliderItem.actor)
        } else {
            // Create an accessible color temperature slider
            this.tempSliderItem  = new Slider.Slider(this.tempSliderHeadPositionOnLoad); // Initialize with a value between 0 and 1
            // Create an accessible brightness slider
            this.brightSliderItem  = new Slider.Slider(this.brightSliderHeadPositionOnLoad); // Initialize with a value between 0 and 1

            // COLOR TEMPERATURE SLIDER:        when you finished dragging the slider...
            // the signal 'drag-end' only passes the slider argument, while the signal 'value-changed' passes slider and value arguments
            this.tempSliderItem_drag_end_signal_id = this.tempSliderItem.connect('drag-end', (slider)=> {
                this.appletToggleSwitch.state && this._set_tray_text(this.tray_text_format, this.currentTemp, this.currentBrightness)
            });

            // COLOR TEMPERATURE SLIDER:        when you are dragging the slider...
            this.tempSliderItem_value_changed_signal_id = this.tempSliderItem.connect('value-changed', (slider, value)=> {
                this.currentTemp = Math.round(value * RANGE_TEMP_VALUES ) + MIN_TEMP_VALUE
                this.dependencies_installed() && this.setTempLabelText(`Color temperature: ${this.currentTemp} K`) 
                this.appletToggleSwitch.state && this._set_temperature(this.currentTemp) // only modify the screen's color temperature if the switch it turned on (enabled)
            });

            // BRIGHTNESS SLIDER:        when you finished dragging the slider...
            // the signal 'drag-end' only passes the slider argument, while the signal 'value-changed' passes slider and value arguments
            this.brightSliderItem_drag_end_signal_id = this.brightSliderItem.connect('drag-end', (slider)=> {
                this.appletToggleSwitch.state && this._set_tray_text(this.tray_text_format, this.currentTemp, this.currentBrightness)
            });

            // BRIGHTNESS SLIDER:        when you are dragging the slider...
            this.brightSliderItem_value_changed_signal_id = this.brightSliderItem.connect('value-changed', (slider, value)=> {
                this.currentBrightness = value * (MAX_BRIGHTNESS_VALUE - MIN_BRIGHTNESS_VALUE) + MIN_BRIGHTNESS_VALUE;
                this.setBrightnessLabelText(`Brightness: ${Math.round(this.currentBrightness*100)} %`) 
                this.appletToggleSwitch.state && this._set_brightness(this.currentBrightness) // only modify the screen's color temperature if the switch it turned on (enabled)
            });

            this.customContainer.addActor(this.tempLabel)
            this.customContainer.addActor(this.tempSliderItem.actor)
            this.customContainer.addActor(this.brightLabel)
            this.customContainer.addActor(this.brightSliderItem.actor)
        }
    },

    handleAppletToggleSwitch(item,value) {
        if(value == ENABLED) {  
            this._set_temperature(this.currentTemp);
            this._set_brightness(this.currentBrightness);
            this._set_tray_text(this.tray_text_format, this.currentTemp, this.currentBrightness)
            this.tempSliderItem.actor.show();
            this.brightSliderItem.actor.show();
            this.tempLabel.show()
            this.brightLabel.show()
        } else if (value == DISABLED) {
            this._reset_temperature_and_brightness();
            this.tempSliderItem.actor.hide();
            this.brightSliderItem.actor.hide();
            this.tempLabel.hide()
            this.brightLabel.hide()
        }
    },

    lockToggleSwitch() {
            this.appletToggleSwitch.setToggleState(false)
            this.appletToggleSwitch.actor.reactive = false;  // Make it non-clickable
            this.appletToggleSwitch.actor.sensitive = false; // Make it visually appear disabled (grayed out)
    },

    unlockToggleSwitch() {
            this.appletToggleSwitch.actor.reactive = true;   // Make it clickable
            this.appletToggleSwitch.actor.sensitive = true;  // Restore its visual appearance

        
    },

    applyTempAndBrightnessOnBoot() {
        if(this.launchAppletOnBoot) {
            this.currentTemp = this.defaultTempValueOnBoot
            this.currentBrightness = this.defaultBrightnessPercentageValueOnBoot/100

            this._set_temperature(this.currentTemp);
            this._set_brightness(this.currentBrightness)
        } 
    },

    dependencies_installed() {
        if(Gio.file_new_for_path("/usr/bin/xsct").query_exists(null)) {
            
            if(this.xsct_exec == null) {
                global.log("The `xsct` package was successfully found in '/usr/bin'.")
                this.xsct_exec = "xsct";
                this.container&& this.container.hide()
                this.unlockToggleSwitch()
            }
            
            return true;
        } else {
            global.log("The `xsct` package was not found in '/usr/bin'...")
            this.container && this.container.show();
            this.lockToggleSwitch()
            this.xsct_exec = null;
            return false;
        }
    },

    install_dependencies_prompt() {
        Util.spawnCommandLine('notify-send --hint=int:transient:1 "' + _("Asking permission to install the '%s' package.").format('xsct') + '" -i ' + this.metadata.path + '/icon.png');
        Util.spawnCommandLine("apturl apt://xsct");
    }

    
};


// ============================================================= MAIN FUNCTION =======================================================

function main(metadata, orientation, panel_height, instance_id) {
    return new BlueLightBlockerApplet(metadata, orientation, panel_height, instance_id);
}
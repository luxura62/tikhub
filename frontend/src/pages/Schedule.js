const BEST_SLOTS = [/* Your best slots data here */];

function getNextBestSlots() {
    // Implementation for retrieving next best slots
}

function Schedule() {
    return (
        <div>
            <div className="step-indicator">/* Step Indicator Markup */</div>
            <div className="upload-zone">/* Upload Zone Markup */</div>
            <form>
                <select name="bestSlots">
                    {BEST_SLOTS.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                </select>
                <button type="submit">Submit</button>
            </form>
            <div className="preview">
                <img src="mockup-tiktok.png" alt="TikTok Mockup" />
            </div>
        </div>
    );
}

export default Schedule;
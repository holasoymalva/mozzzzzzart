import * as Tone from 'tone';

export class AudioEngine {
    private loops: boolean[] = [false, false, false, false];

    // Instruments
    private drumSynth: Tone.MembraneSynth;
    private fluteSynth: Tone.FMSynth;
    private leadSynth: Tone.PolySynth;
    private padSynth: Tone.PolySynth;

    // Modulators/Filters
    private globalFilter: Tone.Filter;
    private reverb: Tone.Reverb;



    constructor() {
        this.drumSynth = new Tone.MembraneSynth().toDestination();

        this.fluteSynth = new Tone.FMSynth({
            harmonicity: 2,
            modulationIndex: 1.5,
            oscillator: { type: 'sine' },
            modulation: { type: 'triangle' },
            envelope: { attack: 0.1, decay: 0.2, sustain: 0.8, release: 0.4 }
        }).toDestination();


        this.globalFilter = new Tone.Filter(2000, 'lowpass');
        this.reverb = new Tone.Reverb(2).connect(this.globalFilter);
        this.globalFilter.toDestination();

        this.leadSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'square' },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.1 }
        }).connect(this.reverb);

        this.padSynth = new Tone.PolySynth(Tone.AMSynth, {
            envelope: { attack: 1, decay: 0.1, sustain: 1, release: 2 }
        }).connect(this.reverb);

        this.setupSequences();
    }

    async start() {
        await Tone.start();
        Tone.Transport.bpm.value = 120;
        Tone.Transport.start();
    }

    private setupSequences() {
        // Drums (Top Left)
        new Tone.Loop((time) => {
            if (this.loops[0]) {
                this.drumSynth.triggerAttackRelease("C1", "8n", time);
                if (Math.random() > 0.5) this.drumSynth.triggerAttackRelease("C2", "16n", time + Tone.Time("4n").toSeconds() / 2);
            }
        }, "4n").start(0);

        // Flute (Top Right)
        const fluteNotes = ["C5", "Eb5", "F5", "G5"];
        let fluteIndex = 0;
        new Tone.Loop((time) => {
            if (this.loops[1]) {
                this.fluteSynth.triggerAttackRelease(fluteNotes[fluteIndex % fluteNotes.length], "8n", time);
                fluteIndex++;
            }
        }, "4n").start(0);

        // Lead (Bottom Left)
        const leadNotes = ["C4", "Eb4", "G4", "Bb4", "C5"];
        let leadIndex = 0;
        new Tone.Loop((time) => {
            if (this.loops[2]) {
                this.leadSynth.triggerAttackRelease(leadNotes[leadIndex % leadNotes.length], "16n", time);
                leadIndex++;
            }
        }, "8n").start(0);

        // Pad (Bottom Right)
        const padChords = [
            ["C4", "Eb4", "G4"],
            ["F3", "Ab3", "C4"],
            ["G3", "B3", "D4"],
            ["C4", "Eb4", "G4"]
        ];
        let padIndex = 0;
        new Tone.Loop((time) => {
            if (this.loops[3]) {
                this.padSynth.triggerAttackRelease(padChords[padIndex % padChords.length], "2n", time);
                padIndex++;
            }
        }, "1m").start(0);
    }

    toggleLoop(index: number) {
        if (index >= 0 && index < 4) {
            this.loops[index] = !this.loops[index];
        }
    }

    setLoop(index: number, state: boolean) {
        if (index >= 0 && index < 4) {
            this.loops[index] = state;
        }
    }

    getLoopState(index: number) {
        return this.loops[index];
    }

    // Modulate based on 0-1 relative values from hand relX, relY
    modulate(relX: number, relY: number, selectedIndex: number) {
        // Map relX to filter frequency, relY to volume or synth parameter
        const freq = Math.max(100, Math.min(10000, Math.pow(relX, 2) * 10000));

        switch (selectedIndex) {
            case 0:
                // Modulate Drums: volume based on relY
                this.drumSynth.volume.rampTo((1 - relY) * 20 - 20, 0.1);
                break;
            case 1:
                // Modulate Flute: Harmonicity & Modulation Index for timber/breathiness changes
                this.fluteSynth.harmonicity.rampTo(1 + relY * 4, 0.1);
                this.fluteSynth.modulationIndex.rampTo(relX * 3, 0.1);
                break;
            case 2:
                // Modulate Lead: detune and general filter
                this.leadSynth.set({ detune: (relY - 0.5) * 1200 });
                this.globalFilter.frequency.rampTo(freq, 0.1);
                break;
            case 3:
                // Modulate Pad: volume and filter
                this.padSynth.volume.rampTo((1 - relY) * 20 - 10, 0.1);
                this.globalFilter.frequency.rampTo(freq, 0.1);
                break;
            default:
                break;
        }
    }
}

export const audioEngine = new AudioEngine();

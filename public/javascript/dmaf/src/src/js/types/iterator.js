dmaf.once("load_iterator", function (DMAF) {
    var methods = {
        "ROUND_ROBIN": function () {
            this.index++;
            this.index %= this.array.length;
            return this.array[this.index];
        },
        "RANDOM_FIRST": function () {
            if (this.index === -1) {
                return this.array[Math.floor(Math.random() * this.array.length)];
            } else {
                return this.array[++this.index];
            }
        },
        "RANDOM": function () {
            return this.array[Math.floor(Math.random() * this.array.length)];
        },
        "SHUFFLE": function () {
            var i;
            if (!this.A.length) {
                this.A = this.array.slice(0);
                this.B = [];
            }
            do {
                i = Math.floor(Math.random() * this.A.length);
            }
            while(this.A[i] === this.previous);
            this.B.push(this.A.splice(i, 1)[0]);
            this.previous = this.B[this.B.length - 1];
            return this.previous;
        }
    };
    DMAF.Iterator = function (sounds, type) {
        this.index = -1;
        this.array = sounds;
        this.getNext = methods[type];
        this.A = sounds.slice(0);
        this.B = [];
    };
});

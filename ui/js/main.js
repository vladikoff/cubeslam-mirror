(function(window, document, $) {
    var cpuConnAnimation;
    var eyeLeft, eyeRight;

    $(function() {
        cpuConnAnimation = $('.cpu-conn-anim');

        if (cpuConnAnimation.length > 0) {
            eyeLeft = document.getElementById('cpu-eye-left');
            eyeRight = document.getElementById('cpu-eye-right');

            [eyeLeft, eyeRight].forEach(function(item) {
                item.addEventListener('webkitAnimationEnd', onAnimationEnd, false);
            });
        }
    });

    function onAnimationEnd(e) {
        if (cpuConnAnimation.hasClass('play-anim') && e.target.id === 'cpu-eye-right') {
            cpuConnAnimation.removeClass('play-anim');

            setTimeout(function() {
                cpuConnAnimation.addClass('reverse-anim');
            }, 300);
        } else if (cpuConnAnimation.hasClass('reverse-anim') && e.target.id === 'cpu-eye-left') {
            cpuConnAnimation.removeClass('reverse-anim');

            setTimeout(function() {
                cpuConnAnimation.addClass('play-anim');
            }, 300);
        }
    }

}(window, window.document, jQuery));

How to hack component to use the 3d renderer separately:

1. Build it

    component build

2. Remove the require stuff on top of build.js

    sed -i -e 1,208d build/build.js

3. Add some magic aliases to the resulting build

    (see aliases.js)


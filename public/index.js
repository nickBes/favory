// score regulation
let points = 8
let sum = 0
let form = document.getElementById('main_form')
let title = document.getElementById('title')
let pluses = document.getElementsByClassName('plus')
let minuses = document.getElementsByClassName('minus')

// add points
for (let plus of pluses) {
    let category = plus.parentElement.getElementsByTagName('input')[0]
    plus.onclick = () => {
        if (sum < points){
            category.value = Number(category.value) + 1
            sum += 1
            title.innerText = `נותרו ${points - sum} נקודות`
        }
    }
}

// remove points
for (let minus of minuses) {
    let category = minus.parentElement.getElementsByTagName('input')[0]
    minus.onclick = () => {
        if (category.value > 0){
            category.value = Number(category.value) - 1
            sum -= 1
            title.innerText = `נותרו ${points - sum} נקודות`
        }
    }
}

// form submit validation
form.onsubmit = event => {
    let catgeories = document.getElementsByClassName('category')
    let amount = 0
    for (let category of catgeories){
        if (Number(category.value) == 0){
            amount++
        }
    }
    if (catgeories.length == amount){
        event.preventDefault()
        let alert = document.getElementById('form_alert')
        alert.style.display = 'block'
        alert.innerText = 'אנא דרגו לפחות קטגוריה אחת לפני שאתם מגישים'
    }
}

//on load stuff...
document.body.onload = () => {
    //point title
    title.innerText = `נותרו ${points - sum} נקודות`
}
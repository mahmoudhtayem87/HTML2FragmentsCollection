function onLanguageChange(event)
        {
            e = event || window.event;
            var target = e.target || e.srcElement;
            document.location = target.value;
        }
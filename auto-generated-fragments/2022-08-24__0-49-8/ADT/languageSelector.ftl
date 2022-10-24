<script>
        function onChange(event)
        {
            e = event || window.event;
            var target = e.target || e.srcElement;
            document.location = target.value;
        }
    </script>
    <div class="input-group-icon languageSelector">
            <div class="icon">
            <@clay["icon"] symbol="globe" /></div>
            <div class="form-select" id="default-select">
                <select class="languageSelectorDropDown" onChange="onChange(event)">
                    <#list entries as curLanguage>
                        <#if !curLanguage.isSelected() > <option value='${curLanguage.getURL()!''}'>
                        </#if>
                        <#if curLanguage.isSelected() > <option selected value='${curLanguage.getURL()!''}'  > </#if>  ${curLanguage.longDisplayName}
                        </option>
                    </#list>
                </select>
            </div>
        </div>
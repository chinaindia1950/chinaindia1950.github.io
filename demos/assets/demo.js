Array.prototype.clean = function() {
  for (var i = 0; i < this.length; i++) {
    if (this[i] === "" || this[i] === null  || this[i] === undefined  ) {         
      this.splice(i, 1);
      i--;
    }
  }
  return this;
};


TableManager = {
    
    ini : function(){
        $(document).on("click", ".remove", TableManager.removeRow );
        $(document).on("click", ".add", TableManager.addRow );
        $(document).on("click", ".update", TableManager.update );
        $(document).on("click", ".reset", TableManager.reset );


         
    },
    reset : function(){
        sessionStorage.removeItem('socialmix');
        window.location.reload();
        
    },
    update : function(){
        var feeds = []
        $("tbody tr.data").each(function(){
            var feed = $(this).data("feed");
            feeds.push(feed);

        });
        sessionStorage.socialmix = JSON.stringify(feeds);
        window.location.reload();
    },

    buildTable : function(feeds){
        $.each(feeds , function(i, feed){
            TableManager.buildRow(feed);

        });


    },
    buildRow : function(obj){
        var tr = $("<tr class='data'><td>"+obj.type+"</td><td>"+obj.id+"</td><td>"+obj.tags+
        "</td><td><button class='btn btn-sm remove'>Remove</button></td></tr>");

        $("tbody").prepend(tr)
        tr.data("feed" , obj);

    },

    removeRow : function(e){
        $(this).parents("tr").remove();
    },

    addRow : function(e){

        var type = $("#feedType").val();
        var id   = $("#feedId").val();
        var tags = $("#feedTag").val().split(",").clean();
        if (id === "" ){
            alert("The feald Feed ID is required.")
            return false;
        }
        var feed = {

            type: type,
            id: id,
            tags: tags 
        };

        TableManager.buildRow(feed);

        $("#feedId").val("");
        $("#feedTag").val("");


    }

};
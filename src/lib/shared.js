function raiseEvent(self, eventName, args){
    if(!self._handlers)
        self._handlers = {};

    let handlers = self._handlers[eventName] || [];

    if(!Array.isArray(handlers))
        return;

    handlers.forEach(handler => {
        try{
            handler(args || self);
        }catch(ex){
            console.log(ex);
        }
    });
}

raiseEvent.install = function(self){
    self._handlers = self._handlers || {};
    self.on = on.bind(null, self);
}

export {
    raiseEvent
}

function on(self, eventName, delegate){
    if(!self._handlers)
        self._handlers = {};

    self._handlers[eventName] = self._handlers[eventName] || [];
    self._handlers[eventName].push(delegate);
}
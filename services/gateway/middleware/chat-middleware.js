import HttpService from "./httpservice";

export const SocketChat = (socket, io) => {

  socket.on("create-chat", async (data) => {
    console.log("======data==>>>",data)
    try {
      const headers = {
        'Authorization': data.token
      }
       
      if(data.type == 'Superadmin'){
        let createChat = await HttpService.postStagingChat('superadmin/create-chat', { data: data }, headers, 'superadminServiceUrl')
        // console.log("create==>", createChat)
        io.in(createChat.body.senderID).emit("room-created", createChat)

        io.in(createChat.body.receiverID).emit("room-created", createChat)
      }else if(data.type == 'Pharmacy'){
        let createChat = await HttpService.postStagingChat('pharmacy/create-chat', { data: data }, headers, 'pharmacyServiceUrl')
        console.log("create==>", createChat)
        io.in(createChat.body.senderID).emit("room-created", createChat)

        io.in(createChat.body.receiverID).emit("room-created", createChat)
      }else if(data.type == 'Insurance'){
        let createChat = await HttpService.postStagingChat('insurance/create-chat', { data: data }, headers, 'insuranceServiceUrl')
        console.log("create==>", createChat)
        io.in(createChat.body.senderID).emit("room-created", createChat)

        io.in(createChat.body.receiverID).emit("room-created", createChat)
      }else if(data.type == 'Hospital'){
        let createChat;
        createChat = await HttpService.postStagingChat('hospital/create-chat', { data: data }, headers, 'hospitalServiceUrl')
        // console.log("create==>", createChat)
        io.in(createChat.body.senderID).emit("room-created", createChat)

        io.in(createChat.body.receiverID).emit("room-created", createChat)

        if(data?.portalType == 'Dental' || data?.portalType == 'Laboratory-Imaging' || data?.portalType == 'Optical' || data?.portalType == 'Paramedical-Professions'){
          createChat = await HttpService.postStagingChat('labimagingdentaloptical/create-chat', { data: data }, headers, 'labimagingdentalopticalServiceUrl')
          // console.log("create==>", createChat)
          io.in(createChat?.body?.senderID).emit("room-created", createChat)
          io.in(createChat?.body?.receiverID).emit("room-created", createChat)
        }
      }else if(data?.type == 'Dental' || data?.type == 'Laboratory-Imaging' || data?.type == 'Optical' || data?.type == 'Paramedical-Professions'){
        let createChat;
        createChat = await HttpService.postStagingChat('labimagingdentaloptical/create-chat', { data: data }, headers, 'labimagingdentalopticalServiceUrl')
        // console.log("create==>", createChat)
        io.in(createChat?.body?.senderID).emit("room-created", createChat)
        io.in(createChat?.body?.receiverID).emit("room-created", createChat)

        if(data?.role === 'HOSPITAL_ADMIN'){
          createChat = await HttpService.postStagingChat('hospital/create-chat', { data: data }, headers, 'hospitalServiceUrl')
          console.log("createChat>>>>>>>>>",createChat)
          io.in(createChat?.body?.senderID).emit("room-created", createChat)
          io.in(createChat?.body?.receiverID).emit("room-created", createChat)
        }

      }

    } catch (err) {
      console.log(err, "err")
    }
  });

  socket.on("get-create-chat-room", async (data) => {
    try {
      const headers = {
        'Authorization': data.token
      }
      if(data.type == 'Superadmin'){
        let newValue = await HttpService.getStagingChat('superadmin/get-create-chat', data, headers, 'superadminServiceUrl')
      }else if(data.type == 'Pharmacy'){
        let newValue = await HttpService.getStagingChat('pharmacy/get-create-chat', data, headers, 'pharmacyServiceUrl')
      }else if(data.type == 'Insurance'){
        let newValue = await HttpService.getStagingChat('insurance/get-create-chat', data, headers, 'insuranceServiceUrl')
      }else if(data.type == 'Hospital'){
        let newValue = await HttpService.getStagingChat('hospital/get-create-chat', data, headers, 'hospitalServiceUrl')
      }else if(data.type == 'Dental' || data.type == 'Laboratory-Imaging' || data.type == 'Optical' || data.type == 'Paramedical-Professions'){
        let newValue = await HttpService.getStagingChat('labimagingdentaloptical/get-create-chat', data, headers, 'labimagingdentalopticalServiceUrl')
      }
     
    } catch (e) {
      console.log(e, "errrrrrrrror1")
    }
  })

  socket.on("joinChatRoom", async (userInfo) => {
    const headers = {
      'Authorization': userInfo.token
    }

    socket.join(userInfo.userId);
    if(userInfo.type == 'Superadmin'){
    let updatedata = await HttpService.postStagingChat('superadmin/update-online-status', { id: userInfo.userId, isOnline: true, socketId: socket.id }, headers, 'superadminServiceUrl')
    }else if(userInfo.type == 'Pharmacy'){
    let updatedata = await HttpService.postStagingChat('pharmacy/update-online-status', { id: userInfo.userId, isOnline: true, socketId: socket.id }, headers, 'pharmacyServiceUrl');
    }else if(userInfo.type == 'Insurance'){
      let updatedata = await HttpService.postStagingChat('insurance/update-online-status', { id: userInfo.userId, isOnline: true, socketId: socket.id }, headers, 'insuranceServiceUrl');
    }else if(userInfo.type == 'Hospital'){
      let updatedata = await HttpService.postStagingChat('hospital/update-online-status', { id: userInfo.userId, isOnline: true, socketId: socket.id }, headers, 'hospitalServiceUrl');
      // console.log("updatedata===",updatedata)
    }else if(userInfo.type == 'Dental' || userInfo.type == 'Laboratory-Imaging' || userInfo.type == 'Optical' || userInfo.type == 'Paramedical-Professions'){
      let updatedata = await HttpService.postStagingChat('labimagingdentaloptical/update-online-status', { id: userInfo.userId, isOnline: true, socketId: socket.id }, headers, 'labimagingdentalopticalServiceUrl');
      // console.log("updatedata===",updatedata)
    }
  });

  socket.on("leave-room", async (userInfo) => {
    const headers = {
      'Authorization': userInfo.token
    }
    // console.log("leave", userInfo.userId);
    socket.leave(userInfo?.userId);
    if(userInfo?.type == 'Superadmin'){
      let updatedata = await HttpService.postStagingChat('superadmin/update-online-status', { id: userInfo.userId, isOnline: false }, headers, 'superadminServiceUrl')
    }else if(userInfo?.type == 'Pharmacy'){
      let updatedata = await HttpService.postStagingChat('pharmacy/update-online-status', { id: userInfo.userId, isOnline: false }, headers, 'pharmacyServiceUrl')
    }else if(userInfo?.type == 'Insurance'){
      let updatedata = await HttpService.postStagingChat('insurance/update-online-status', { id: userInfo.userId, isOnline: false }, headers, 'insuranceServiceUrl')
    }else if(userInfo?.type == 'Hospital'){
      let updatedata = await HttpService.postStagingChat('hospital/update-online-status', { id: userInfo.userId, isOnline: false }, headers, 'hospitalServiceUrl')
    }else if(userInfo?.type == 'Dental' || userInfo?.type == 'Laboratory-Imaging' || userInfo?.type == 'Optical' || userInfo?.type == 'Paramedical-Professions'){
      let updatedata = await HttpService.postStagingChat('labimagingdentaloptical/update-online-status', { id: userInfo.userId, isOnline: false }, headers, 'labimagingdentalopticalServiceUrl')
    }

  });

  socket.on("new-message", async (messageData) => {
    try {
      const headers = {
        'Authorization': messageData.token
      }
    
      if(messageData.type == 'Superadmin'){
        let sendMessagData = await HttpService.postStagingChat('superadmin/create-message', { data: messageData }, headers, 'superadminServiceUrl')
        io.in(messageData.senderID).emit("new-message-read", sendMessagData.body);
        io.in(messageData.receiverID).emit("new-message-read", sendMessagData.body);
  
        let saveNotification = await HttpService.postStagingChat('superadmin/save-notification',
          {
            chatId: messageData.chatId,
            created_by: messageData.senderID,
            for_portal_user: messageData.receiverID,
            content: messageData.message,
            notitype: messageData.notitype,
            created_by_type: messageData.created_by_type
          }, headers, 'superadminServiceUrl')
  
        await io.in(messageData.chatId).emit("received-notification", saveNotification)
      }else if(messageData.type == 'Pharmacy'){
        let sendMessagData = await HttpService.postStagingChat('pharmacy/create-message', { data: messageData }, headers, 'pharmacyServiceUrl');

        io.in(messageData.senderID).emit("new-message-read", sendMessagData.body);
        io.in(messageData.receiverID).emit("new-message-read", sendMessagData.body);
  
        let saveNotification = await HttpService.postStagingChat('pharmacy/save-notification',
          {
            chatId: messageData.chatId,
            created_by: messageData.senderID,
            for_portal_user: messageData.receiverID,
            content: messageData.message,
            notitype: messageData.notitype,
            created_by_type: messageData.created_by_type
          }, headers, 'pharmacyServiceUrl')
  
        await io.in(messageData.chatId).emit("received-notification", saveNotification)
      }else if(messageData?.type == 'Insurance'){
        let sendMessagData = await HttpService.postStagingChat('insurance/create-message', { data: messageData }, headers, 'insuranceServiceUrl');

        io.in(messageData?.senderID).emit("new-message-read", sendMessagData?.body);
        io.in(messageData?.receiverID).emit("new-message-read", sendMessagData?.body);
  
        let saveNotification = await HttpService.postStagingChat('insurance/save-notification',
          {
            chatId: messageData?.chatId,
            created_by: messageData?.senderID,
            for_portal_user: messageData?.receiverID,
            content: messageData?.message,
            notitype: messageData?.notitype,
            created_by_type: messageData?.created_by_type
          }, headers, 'insuranceServiceUrl')
  
        await io.in(messageData?.chatId).emit("received-notification", saveNotification)
      }else if(messageData?.type == 'Hospital'){
        let sendMessagData = await HttpService.postStagingChat('hospital/create-message', { data: messageData }, headers, 'hospitalServiceUrl');
        
        io.in(messageData?.senderID).emit("new-message-read", sendMessagData?.body);
        io.in(messageData?.receiverID).emit("new-message-read", sendMessagData?.body);
  
        let saveNotification = await HttpService.postStagingChat('hospital/save-notification',
          {
            chatId: messageData?.chatId,
            created_by: messageData?.senderID,
            for_portal_user: messageData?.receiverID,
            content: messageData?.message,
            notitype: messageData?.notitype,
            created_by_type: messageData?.created_by_type
          }, headers, 'hospitalServiceUrl')
  
        await io.in(messageData?.chatId).emit("received-notification", saveNotification)

        if(messageData?.fourPortalRole == 'INDIVIDUAL' || messageData?.fourPortalRole == 'HOSPITAL'){
          sendMessagData = await HttpService.postStagingChat('labimagingdentaloptical/create-message', { data: messageData }, headers, 'labimagingdentalopticalServiceUrl');

          let saveNotification = await HttpService.postStagingChat('labimagingdentaloptical/save-notification',
          {
            chatId: messageData?.chatId,
            created_by: messageData?.senderID,
            for_portal_user: messageData?.receiverID,
            content: messageData?.message,
            notitype: messageData?.notitype,
            created_by_type: messageData?.created_by_type
          }, headers, 'labimagingdentalopticalServiceUrl')
  
          await io.in(messageData?.chatId).emit("received-notification", saveNotification)
        }
      }else if(messageData?.type == 'Dental' || messageData?.type == 'Laboratory-Imaging' || messageData?.type == 'Optical' || messageData?.type == 'Paramedical-Professions'){
        // let sendMessagData = await HttpService.postStagingChat('labimagingdentaloptical/create-message', { data: messageData }, headers, 'labimagingdentalopticalServiceUrl');
        // // console.log(messageData.senderID, "============testing", messageData.receiverID);
        // io.in(messageData.senderID).emit("new-message-read", sendMessagData.body);
        // io.in(messageData.receiverID).emit("new-message-read", sendMessagData.body);

        let sendMessagData;
        sendMessagData = await HttpService.postStagingChat('labimagingdentaloptical/create-message', { data: messageData }, headers, 'labimagingdentalopticalServiceUrl');
        io.in(messageData?.senderID).emit("new-message-read", sendMessagData?.body);
        io.in(messageData?.receiverID).emit("new-message-read", sendMessagData?.body);

        let saveNotification = await HttpService.postStagingChat('labimagingdentaloptical/save-notification',
          {
            chatId: messageData?.chatId,
            created_by: messageData?.senderID,
            for_portal_user: messageData?.receiverID,
            content: messageData?.message,
            notitype: messageData?.notitype,
            created_by_type: messageData?.created_by_type
          }, headers, 'labimagingdentalopticalServiceUrl')
  
        await io.in(messageData.chatId).emit("received-notification", saveNotification)
      }
      
    } catch (e) {
      console.log(e, "errrrrrrrror2")
    }
  });

  socket.on("create-group-chat", async (data) => {
    try {
      const headers = {
        'Authorization': data.token
      }

      if(data.type == 'Superadmin'){
        let createGroup = await HttpService.postStagingChat('superadmin/create-group-chat', { data: data }, headers, 'superadminServiceUrl')
        // console.log("createGroup=>", createGroup)
  
        io.in(createGroup.body.senderID).emit("group-room-created", createGroup)
  
        io.in(createGroup.body.receiverID).emit("group-room-created", createGroup)
      }else if(data.type == 'Pharmacy'){
        let createGroup = await HttpService.postStagingChat('pharmacy/create-group-chat', { data: data }, headers, 'pharmacyServiceUrl')
        // console.log("createGroup=>", createGroup)
  
        io.in(createGroup.body.senderID).emit("group-room-created", createGroup)
  
        io.in(createGroup.body.receiverID).emit("group-room-created", createGroup)
      }else if(data.type == 'Insurance'){
        let createGroup = await HttpService.postStagingChat('insurance/create-group-chat', { data: data }, headers, 'insuranceServiceUrl')
        // console.log("createGroup=>", createGroup)
  
        io.in(createGroup.body.senderID).emit("group-room-created", createGroup)
  
        io.in(createGroup.body.receiverID).emit("group-room-created", createGroup)
      }else if(data.type == 'Hospital'){
        let createGroup = await HttpService.postStagingChat('hospital/create-group-chat', { data: data }, headers, 'hospitalServiceUrl')
        // console.log("createGroup=>", createGroup)
  
        io.in(createGroup.body.senderID).emit("group-room-created", createGroup)
  
        io.in(createGroup.body.receiverID).emit("group-room-created", createGroup)
      }else if(data.type == 'Dental' || data.type == 'Laboratory-Imaging' || data.type == 'Optical' || data.type == 'Paramedical-Professions'){
        let createGroup = await HttpService.postStagingChat('labimagingdentaloptical/create-group-chat', { data: data }, headers, 'labimagingdentalopticalServiceUrl')
        // console.log("createGroup=>", createGroup)
  
        io.in(createGroup?.body?.senderID).emit("group-room-created", createGroup)
  
        io.in(createGroup?.body?.receiverID).emit("group-room-created", createGroup)
      }
     
    } catch (e) {
      console.log(e, "errrrrrrrror3")
    }
  });

  socket.on("add-member-to-group-chat", async (data) => {
    // console.log("add-member-to-group-564", data)
    try {
      const headers = {
        'Authorization': data.token
      }

      if(data.type == 'Superadmin'){
        let createGroup = await HttpService.postStagingChat('superadmin/addmembers-to-groupchat', { data: data }, headers, 'superadminServiceUrl')
        // console.log("createGroup==>", createGroup)
  
        io.in(createGroup.body.senderID).emit("add-member-to-room", createGroup)
  
        io.in(createGroup.body.receiverID).emit("add-member-to-room", createGroup)
  
        let saveNotification = await HttpService.postStagingChat('superadmin/save-notification',
          {
            chatId: data.chatId,
            created_by: data.senderID,
            for_portal_user: data.newMembers,
            content: data.message,
            notitype: data.notitype,
            created_by_type: data.created_by_type
          }, headers, 'superadminServiceUrl')
  
        await io.in(data.chatId).emit("received-notification", saveNotification)
      }else if(data.type == 'Pharmacy'){
        let createGroup = await HttpService.postStagingChat('pharmacy/addmembers-to-groupchat', { data: data }, headers, 'pharmacyServiceUrl')
        // console.log("createGroup==>", createGroup)
  
        io.in(createGroup.body.senderID).emit("add-member-to-room", createGroup)
  
        io.in(createGroup.body.receiverID).emit("add-member-to-room", createGroup)
  
        let saveNotification = await HttpService.postStagingChat('pharmacy/save-notification',
          {
            chatId: data.chatId,
            created_by: data.senderID,
            for_portal_user: data.newMembers,
            content: data.message,
            notitype: data.notitype,
            created_by_type: data.created_by_type
          }, headers, 'pharmacyServiceUrl')
  
        await io.in(data.chatId).emit("received-notification", saveNotification)
      }else if(data.type == 'Insurance'){
        let createGroup = await HttpService.postStagingChat('insurance/addmembers-to-groupchat', { data: data }, headers, 'insuranceServiceUrl')
        // console.log("createGroup==>", createGroup)
  
        io.in(createGroup.body.senderID).emit("add-member-to-room", createGroup)
  
        io.in(createGroup.body.receiverID).emit("add-member-to-room", createGroup)
  
        let saveNotification = await HttpService.postStagingChat('insurance/save-notification',
          {
            chatId: data.chatId,
            created_by: data.senderID,
            for_portal_user: data.newMembers,
            content: data.message,
            notitype: data.notitype,
            created_by_type: data.created_by_type
          }, headers, 'insuranceServiceUrl')
  
        await io.in(data.chatId).emit("received-notification", saveNotification)
      }else if(data.type == 'Hospital'){
        let createGroup = await HttpService.postStagingChat('hospital/addmembers-to-groupchat', { data: data }, headers, 'hospitalServiceUrl')
        // console.log("createGroup==>", createGroup)
  
        io.in(createGroup.body.senderID).emit("add-member-to-room", createGroup)
  
        io.in(createGroup.body.receiverID).emit("add-member-to-room", createGroup)
  
        let saveNotification = await HttpService.postStagingChat('hospital/save-notification',
          {
            chatId: data.chatId,
            created_by: data.senderID,
            for_portal_user: data.newMembers,
            content: data.message,
            notitype: data.notitype,
            created_by_type: data.created_by_type
          }, headers, 'hospitalServiceUrl')
  
        await io.in(data.chatId).emit("received-notification", saveNotification)
      }else if(data.type == 'Dental' || data.type == 'Laboratory-Imaging' || data.type == 'Optical' || data.type == 'Paramedical-Professions'){
        let createGroup = await HttpService.postStagingChat('labimagingdentaloptical/addmembers-to-groupchat', { data: data }, headers, 'labimagingdentalopticalServiceUrl')
        // console.log("createGroup==>", createGroup)
  
        io.in(createGroup?.body?.senderID).emit("add-member-to-room", createGroup)
  
        io.in(createGroup?.body?.receiverID).emit("add-member-to-room", createGroup)
  
        let saveNotification = await HttpService.postStagingChat('labimagingdentaloptical/save-notification',
          {
            chatId: data?.chatId,
            created_by: data?.senderID,
            for_portal_user: data?.newMembers,
            content: data?.message,
            notitype: data?.notitype,
            created_by_type: data?.created_by_type
          }, headers, 'labimagingdentalopticalServiceUrl')
  
        await io.in(data?.chatId).emit("received-notification", saveNotification)
      }
     
    } catch (e) {
      console.log(e, "errrrrrrrror4")
    }
  });

}







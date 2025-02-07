Ext.ns('SM.Attachments')

SM.Attachments.Grid = Ext.extend(Ext.grid.GridPanel, {
  initComponent: function() {
    const me = this
    const nonce = Ext.id()
    const fields = [
      'name',
      'size',
      'type',
      'description',
      'digest',
      'user',
      {
        name: 'date',
        type: 'date',
        dateFormat: 'c'
      }
    ]
    const totalTextCmp = new Ext.Toolbar.TextItem ({
      text: '0 records',
      width: 80
    })
    const store = new Ext.data.JsonStore({
      grid: this,
      root: '',
      fields: fields,
      idProperty: 'digest'
    })
    const columns = [
      {
        header: "Artifact",
        id: `name-${nonce}`,
        width: 100,
        dataIndex: 'name',
        sortable: true,
        align: 'left',
        renderer: function (value, metadata, record) {
          var returnStr = '<img src="' + getFileIcon(value) + '" class="sm-artifact-file-icon">';
          returnStr += '<b>' + value + '</b>';
          returnStr += '<br><b>Type:</b> ' + record.data.type + ' <b>Size:</b> ' + record.data.size;
          returnStr += `<br><i>Attached ${record.data.date.format('Y-m-d')} by ${record.data.user.name}</i>`;
          return returnStr;
        }
      },
      {
        width: 25,
        header: 'download', // not shown, used in cellclick handler
        fixed: true,
        dataIndex: 'none',
        renderer: function (value, metadata, record) {
          metadata.css = 'artifact-view';
          metadata.attr = 'ext:qtip="View artifact"';
          return '';
        }
      },
      {
        width: 25,
        header: 'delete',
        fixed: true,
        dataIndex: 'none',
        renderer: function (value, metadata, record) {
          metadata.css = 'artifact-delete';
          metadata.attr = 'ext:qtip="Unattach the artifact from this review"';
          return '';
        }
      }
    ]
    const loadArtifacts = async function () {
      try {
        store.removeAll()
        const artifactValue = await getMetadataValue('artifacts')
        store.loadData(JSON.parse(artifactValue))
      }
      catch (e) {
        me.loadMask.hide()
        console.log(e)
      }
    }
    const getMetadataValue = async function (key) {
      const result = await Ext.Ajax.requestPromise({
        url: `${STIGMAN.Env.apiBase}/collections/${me.collectionId}/reviews/${me.assetId}/${me.ruleId}/metadata/keys/${key}`,
        method: 'GET'
      })
      return JSON.parse(result.response.responseText)  
    }
    const onFileSelected = async function (uploadField) {
      try {
        let input = uploadField.fileInput.dom
        const files = [...input.files]
        await putArtifact(files[0])
        uploadField.reset()
      }
      catch (e) {
        uploadField.reset()
        alert(e.message)
      }
    }

    const putArtifact = async function (file) {
      let fields
      try {
        fields = await getMetadataFromFile(file)
        await putMetadataValue(fields.attachment.digest, fields.data)
      }
      catch (e) {
        Ext.Msg.alert("Error", `Failed to save file data: ${e.message}`)
        return
      }
      try {
        store.loadData([fields.attachment], true) // append
        const data = store.getRange().map( record => record.data )
        await putMetadataValue('artifacts', JSON.stringify(data))
      }
      catch (e) {
        try {
          await deleteMetadataKey(fields.attachment.digest)
        }
        catch (e) {
          console.log(e)
          Ext.Msg.alert("Error", `Failed to save metadata: ${e.message}`)
        }
      }
    }
    const getMetadataFromFile = async function  (file) {
      const hasher = new asmCrypto.Sha256()
      const dataBuffer = await readArrayBufferAsync(file)
      const dataArray = new Uint8Array(dataBuffer)
      const base64 = asmCrypto.bytes_to_base64(dataArray)
      hasher.process(dataArray)
      hasher.finish()
      const shahex = asmCrypto.bytes_to_hex(hasher.result)
      return {
        attachment: {
          name: file.name,
          date: new Date(),
          size: file.size,
          type: file.type,
          user: {
            userId: curUser.userId,
            name: curUser.display
          },
          digest: shahex
        },
        data: base64
      }
    }
    const putMetadataValue = async function (key, value) {
      const result = await Ext.Ajax.requestPromise({
        url: `${STIGMAN.Env.apiBase}/collections/${me.collectionId}/reviews/${me.assetId}/${me.ruleId}/metadata/keys/${key}`,
        method: 'PUT',
        jsonData: JSON.stringify(value)
      })
      return result.response.responseText ? JSON.parse(result.response.responseText) : ""
    }
    const removeArtifact = async function (record) {
      const confirm = await SM.confirmPromise('Confirm',`Remove ${record.data.name}?`)
      if (confirm === 'yes') {
        try {
          await deleteMetadataKey(record.data.digest)
        }
        catch (e) {
          Ext.Msg.alert("Error", `Failed to delete metadata key: ${e.message}`)
          return
        }
        try {
          store.remove(record)
          const data = store.getRange().map( record => record.data)
          await putMetadataValue('artifacts', JSON.stringify(data))  
        }
        catch (e) {
          Ext.Msg.alert("Error", `Failed to update metadata: ${e.message}`)
        }
      }
    }
    const deleteMetadataKey = async function (key) {
      let result = await Ext.Ajax.requestPromise({
        url: `${STIGMAN.Env.apiBase}/collections/${me.collectionId}/reviews/${me.assetId}/${me.ruleId}/metadata/keys/${key}`,
        method: 'DELETE'
      })
      return result.response.responseText ? JSON.parse(result.response.responseText) : ""
    }
    const showImage = async function (artifactObj) {
      const imagePanel = new Ext.Panel({
        bodyStyle: 'background-color: #333;'
      })
      const vpSize = Ext.getBody().getViewSize()
      let height = vpSize.height * 0.75
      let width = vpSize.width * 0.75 <= 1024 ? vpSize.width * 0.75 : 1024
      const fpwindow = new Ext.Window({
        title: `Image`,
        modal: true,
        resizable: true,
        width: width,
        height: height,
        layout: 'fit',
        plain: true,
        bodyStyle: 'padding:5px;',
        buttonAlign: 'center',
        items: imagePanel
      })
      fpwindow.show()
      // could show a wait indicator for image loading if necessary
      try {
        const imageB64 = await getMetadataValue(artifactObj.digest)
        imagePanel.update(`<img style='height: 100%; width: 100%; object-fit: contain' src='data:${artifactObj.type};base64,${encodeURI(imageB64)}'></img>`) 
      }
      catch (e) {
       Ext.Msg.alert("Error", "File data not available")
      }
    }
    const fileUploadField = new Ext.ux.form.FileUploadField({
      buttonOnly: true,
      accept: '.gif,.jpg,.jpeg,.svg,.png,.bmp',
      webkitdirectory: false,
      multiple: false,
      style: 'width: 95px;',
      buttonText: `Attach image...`,
      buttonCfg: {
          icon: "img/attach-16.png"
      },
      listeners: {
          fileselected: onFileSelected
      }      
    })
    const config = {
      loadArtifacts: loadArtifacts,
      fileUploadField: fileUploadField,
      disableSelection: true,
      layout: 'fit',
      cls: 'custom-artifacts',
      hideHeaders: true,
      border: false,
      store: store,
      columns: columns,
      stripeRows: true,
      view: new Ext.grid.GridView({
        forceFit: true,
        emptyText: 'No attachments to display.',
        deferEmptyText: false
      }),
      tbar: new Ext.Toolbar({
        items: [
          fileUploadField
        ]
      }),
      loadMask: true,
      autoExpandColumn: `name-${nonce}`,
      emptyText: 'No attachments to display',
      listeners: {
        cellclick: function (grid, rowIndex, columnIndex, e) {
          var r = grid.getStore().getAt(rowIndex)
          var header = grid.getColumnModel().getColumnHeader(columnIndex)
          switch (header) {
            case 'download':
              showImage(r.data)
              break;
            case 'delete':
              removeArtifact(r)
              break;
          }
        }
      }
    }   
    Ext.apply(this, Ext.apply(this.initialConfig, config))
    SM.Attachments.Grid.superclass.initComponent.call(this)
  }
})


function readBinaryStringAsync(file) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result);
    }
    reader.onerror = reject;
    reader.readAsBinaryString(file)
  })
}

function readArrayBufferAsync(file) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result);
    }
    reader.onerror = reject;
    reader.readAsArrayBuffer(file)
  })
}
